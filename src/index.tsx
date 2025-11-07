/**
 * External dependencies
 */
import axe from 'axe-core';
import type { RunOptions } from 'axe-core';
import './style.scss';
import universalAccessIcon from './icons/universal-access-icon';

/**
 * WordPress dependencies
 */
import { registerPlugin } from '@wordpress/plugins';
import {
  PluginDocumentSettingPanel,
  PluginPostStatusInfo,
  PluginPrePublishPanel,
} from '@wordpress/editor';
import { dispatch, registerStore, select, useSelect } from '@wordpress/data';
import { serialize } from '@wordpress/blocks';
import {
  Button,
  Card,
  CardBody,
  Notice,
  PanelBody,
  Spinner,
  ToolbarButton,
  Dropdown,
  ToolbarGroup,
  MenuGroup,
  MenuItem,
  __experimentalText as Text,
  __experimentalItemGroup as ItemGroup,
  __experimentalItem as Item,
} from '@wordpress/components';
import { Icon } from '@wordpress/icons';
import {
  Fragment,
  createElement,
  createPortal,
  useEffect,
  useMemo,
  useState,
} from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { BlockControls } from '@wordpress/block-editor';

// Define a custom type for our violation to include the block name.
interface ViolationWithContext extends axe.Result {
  blockName?: string;
  blockClientId?: string;
}

interface ScanMetrics {
  totalBlocks: number;
  scannedBlocks: number;
  skippedBlocks: number;
  violations: ViolationWithContext[];
  errors: string[];
}

interface StoredScan extends ScanMetrics {
  contentHash: string;
  completedAt: string;
}

interface BlockViolationState {
  blockViolations: Record<string, number>;
  blockViolationDetails: Record<string, ViolationWithContext[]>;
}

const STORAGE_PREFIX = 'wpav-scan-';
const SCAN_NOTICE_ID = 'wpav-scan-status';
const PANEL_NAME = 'wp-accessibility-validator-panel';
const PANEL_STORE_ID = `plugin-document-setting-panel/${PANEL_NAME}`;
const STORE_NAME = 'wpav/accessibility';
const DEFAULT_WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag2aaa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa',
];

const getAvailableWcagLabels = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {};
  }

  return window.wpavSettings?.availableWcagTags ?? {};
};

const resolveDefaultWcagTags = (): string[] => {
  if (typeof window === 'undefined') {
    return DEFAULT_WCAG_TAGS;
  }

  const defaults = window.wpavSettings?.defaultWcagTags;

  if (Array.isArray(defaults) && defaults.length > 0) {
    return defaults;
  }

  const labels = getAvailableWcagLabels();
  const labelKeys = Object.keys(labels);

  return labelKeys.length > 0 ? labelKeys : DEFAULT_WCAG_TAGS;
};

const getConfiguredWcagTags = (): string[] => {
  if (typeof window === 'undefined') {
    return DEFAULT_WCAG_TAGS;
  }

  const tags = window.wpavSettings?.wcagTags;

  if (Array.isArray(tags) && tags.length > 0) {
    return tags.filter((tag): tag is string => typeof tag === 'string');
  }

  return resolveDefaultWcagTags();
};

const formatWcagLabelList = (
  tags: string[],
  labels: Record<string, string>
): string => {
  return tags.map((tag) => labels[tag] ?? tag).join(', ');
};

const getStorageKey = (postId?: number | null) =>
  typeof postId === 'number' ? `${STORAGE_PREFIX}${postId}` : null;

const focusBlockById = (clientId?: string) => {
  if (!clientId) {
    return;
  }
  const blockDispatch = dispatch('core/block-editor') as Record<string, any>;
  blockDispatch?.selectBlock?.(clientId);
};

const openResultsPanel = () => {
  const editPostDispatch = dispatch('core/edit-post') as Record<string, any>;
  const editorSelect = select('core/editor') as Record<string, any>;

  editPostDispatch?.openGeneralSidebar?.('edit-post/document');

  if (
    editPostDispatch?.toggleEditorPanelOpened &&
    editorSelect?.isEditorPanelOpened &&
    !editorSelect.isEditorPanelOpened(PANEL_STORE_ID)
  ) {
    editPostDispatch.toggleEditorPanelOpened(PANEL_STORE_ID);
  }
};

const DEFAULT_STORE_STATE: BlockViolationState = {
  blockViolations: {},
  blockViolationDetails: {},
};

const registerViolationStore = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const globalScope = window as Window &
    typeof globalThis & { wpavStoreRegistered?: boolean };

  if (globalScope.wpavStoreRegistered) {
    return;
  }

  registerStore(STORE_NAME, {
    reducer: (
      state: BlockViolationState = DEFAULT_STORE_STATE,
      action: {
        type: string;
        blockViolations?: Record<string, number>;
        blockViolationDetails?: Record<string, ViolationWithContext[]>;
      }
    ) => {
      switch (action.type) {
        case 'SET_BLOCK_VIOLATIONS':
          return {
            ...state,
            blockViolations: action.blockViolations || {},
            blockViolationDetails: action.blockViolationDetails || {},
          };
        default:
          return state;
      }
    },
    actions: {
      setBlockViolations(
        blockViolations: Record<string, number>,
        blockViolationDetails: Record<string, ViolationWithContext[]>
      ) {
        return {
          type: 'SET_BLOCK_VIOLATIONS',
          blockViolations,
          blockViolationDetails,
        };
      },
    },
    selectors: {
      getBlockViolations(state: BlockViolationState) {
        return state.blockViolations;
      },
      hasBlockViolations(state: BlockViolationState, clientId: string) {
        return Boolean(state.blockViolations?.[clientId]);
      },
      getBlockViolationDetails(state: BlockViolationState) {
        return state.blockViolationDetails;
      },
      getBlockViolationsForBlock(state: BlockViolationState, clientId: string) {
        return state.blockViolationDetails?.[clientId] || [];
      },
    },
  });

  globalScope.wpavStoreRegistered = true;
};

registerViolationStore();

const applyBlockViolationIndicator = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const globalScope = window as Window &
    typeof globalThis & { wpavBlockFilterApplied?: boolean };

  if (globalScope.wpavBlockFilterApplied) {
    return;
  }

  const withViolationIndicator = createHigherOrderComponent(
    (BlockListBlock: any) => {
      return (props: Record<string, any>) => {
        const violationCount = useSelect(
          (selectFn) => {
            const store = selectFn(STORE_NAME) as
              | Record<string, any>
              | undefined;
            if (!store?.getBlockViolations) {
              return 0;
            }
            const all = store.getBlockViolations() as Record<string, number>;
            return all?.[props.clientId] || 0;
          },
          [props.clientId]
        );

        const hasViolations = violationCount > 0;

        const className = [
          props.className,
          hasViolations ? 'wpav-block--flagged' : null,
        ]
          .filter(Boolean)
          .join(' ');

        const wrapperProps = {
          ...props.wrapperProps,
          'data-wpav-block-has-violations': hasViolations ? 'true' : undefined,
          'data-wpav-violation-label': hasViolations
            ? violationCount === 1
              ? '1 issue'
              : `${violationCount} issues`
            : undefined,
        };

        return (
          <BlockListBlock
            {...props}
            className={className}
            wrapperProps={wrapperProps}
          />
        );
      };
    },
    'withWpavViolationIndicator'
  );

  addFilter(
    'editor.BlockListBlock',
    'wp-accessibility-validator/block-indicator',
    withViolationIndicator
  );

  globalScope.wpavBlockFilterApplied = true;
};

applyBlockViolationIndicator();

const applyBlockToolbarIndicator = () => {
  if (typeof window === 'undefined') {
    return;
  }

  const globalScope = window as Window &
    typeof globalThis & { wpavToolbarFilterApplied?: boolean };

  if (globalScope.wpavToolbarFilterApplied) {
    return;
  }

  const withBlockToolbarIndicator = createHigherOrderComponent(
    (BlockEdit: any) => {
      return (props: Record<string, any>) => {
        const { violationCount, violationDetails } = useSelect(
          (selectFn) => {
            const store = selectFn(STORE_NAME) as
              | Record<string, any>
              | undefined;
            if (!store?.getBlockViolations) {
              return { violationCount: 0, violationDetails: [] };
            }
            const counts = store.getBlockViolations() as Record<string, number>;
            const details = store.getBlockViolationDetails
              ? store.getBlockViolationDetails()
              : {};
            return {
              violationCount: counts?.[props.clientId] || 0,
              violationDetails: details?.[props.clientId] || [],
            };
          },
          [props.clientId]
        );

        const hasViolations = violationCount > 0;
        const label =
          violationCount === 1
            ? 'Accessibility checker: 1 issue detected'
            : `Accessibility checker: ${violationCount} issues detected`;

        const handleViewPanel = () => {
          focusBlockById(props.clientId);
          openResultsPanel();
          const detailIds = violationDetails
            .map((violation: ViolationWithContext) => violation.id)
            .filter(Boolean);

          const editPostDispatch = dispatch('core/edit-post') as Record<
            string,
            any
          >;

          if (editPostDispatch?.toggleEditorPanelOpened) {
            editPostDispatch.toggleEditorPanelOpened(PANEL_STORE_ID, true);
          }

          if (detailIds.length > 0 && typeof document !== 'undefined') {
            // Slight delay to allow panel to render before focusing.
            window.requestAnimationFrame(() => {
              detailIds.forEach((violationId: string) => {
                const element = document.querySelector(
                  `[data-wpav-violation-id="${violationId}"]`
                ) as HTMLElement | null;
                if (element) {
                  element.classList.add('wpav-highlight');
                  element.scrollIntoView({
                    block: 'center',
                    behavior: 'smooth',
                  });
                  window.setTimeout(() => {
                    element.classList.remove('wpav-highlight');
                  }, 2000);
                }
              });
            });
          }
        };

        return (
          <Fragment>
            <BlockEdit {...props} />
            {hasViolations && (
              <BlockControls>
                <Dropdown
                  popoverProps={{ className: 'wpav-toolbar-dropdown' }}
                  renderToggle={({ isOpen, onToggle }) => (
                    <ToolbarGroup>
                      <ToolbarButton
                        icon={<Icon icon={universalAccessIcon} />}
                        label={label}
                        showTooltip
                        isPressed={isOpen}
                        onClick={() => {
                          focusBlockById(props.clientId);
                          onToggle();
                        }}
                      />
                    </ToolbarGroup>
                  )}
                  renderContent={({ onClose }) => (
                    <MenuGroup
                      label={
                        violationCount === 1
                          ? '1 issue found in this block'
                          : `${violationCount} issues found in this block`
                      }
                    >
                      <ItemGroup>
                        {violationDetails.map(
                          (violation: ViolationWithContext, index: number) => (
                            <Item key={`${violation.id}-${index}`}>
                              <Text isBlock>{violation.help}</Text>
                              <Text isBlock variant="muted">
                                {violation.description}
                                {violation.helpUrl && (
                                  <a
                                    href={violation.helpUrl}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                  >
                                    View guidance
                                  </a>
                                )}
                              </Text>
                            </Item>
                          )
                        )}
                      </ItemGroup>

                      <MenuItem
                        onClick={() => {
                          onClose();
                          handleViewPanel();
                        }}
                      >
                        Open accessibility panel
                      </MenuItem>
                    </MenuGroup>
                  )}
                />
              </BlockControls>
            )}
          </Fragment>
        );
      };
    },
    'withBlockToolbarIndicator'
  );

  addFilter(
    'editor.BlockEdit',
    'wp-accessibility-validator/block-toolbar-indicator',
    withBlockToolbarIndicator
  );

  globalScope.wpavToolbarFilterApplied = true;
};

applyBlockToolbarIndicator();

const loadStoredScan = (key: string): StoredScan | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredScan;
  } catch (error) {
    console.warn('Unable to read stored accessibility scan results.', error);
    return null;
  }
};

const saveStoredScan = (key: string, data: StoredScan) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Unable to persist accessibility scan results.', error);
  }
};

const HEADER_SETTINGS_SELECTORS = [
  '.editor-header__settings',
  '.edit-post-header__settings',
];
const PUBLISH_BUTTON_SELECTORS = [
  '.editor-post-publish-button__button',
  '.editor-post-publish-button',
];

const useHeaderButtonSlot = (): HTMLElement | null => {
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    let mount: HTMLDivElement | null = null;
    let frame: number | null = null;

    const ensureSlot = () => {
      const settingsArea = document.querySelector(
        HEADER_SETTINGS_SELECTORS.join(', ')
      ) as HTMLElement | null;

      if (!settingsArea) {
        frame = window.requestAnimationFrame(ensureSlot);
        return;
      }

      mount = document.createElement('div');
      mount.className = 'wpav-header-button';

      const publishButton = settingsArea.querySelector(
        PUBLISH_BUTTON_SELECTORS.join(', ')
      );
      settingsArea.insertBefore(mount, publishButton);
      setSlot(mount);
    };

    ensureSlot();

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (mount?.parentNode) {
        mount.parentNode.removeChild(mount);
      }
      setSlot(null);
    };
  }, []);

  return slot;
};

/**
 * Runs an accessibility scan using client-side rendered HTML.
 */
async function runClientSideScan(): Promise<ScanMetrics> {
  const blocks = select('core/block-editor').getBlocks();
  const allViolations: ViolationWithContext[] = [];
  let scannedBlocks = 0;
  let skippedBlocks = 0;
  const errors: string[] = [];
  const wcagTags = getConfiguredWcagTags();
  const runOptions: RunOptions = {
    resultTypes: ['violations'],
  };

  if (wcagTags.length > 0) {
    runOptions.runOnly = {
      type: 'tag',
      values: wcagTags,
    };
  }

  for (const block of blocks) {
    const renderedHtml = serialize([block]);

    if (
      renderedHtml.trim().length === 0 ||
      renderedHtml.startsWith('<!-- wp:latest-posts')
    ) {
      skippedBlocks++;
      continue;
    }

    // Create an element and position it off-screen instead of using `hidden`.
    // This makes it visually hidden but still available to accessibility tools like Axe.
    const temporaryElement = document.createElement('div');
    Object.assign(temporaryElement.style, {
      position: 'absolute',
      left: '-10000px',
      top: 'auto',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    });
    temporaryElement.innerHTML = renderedHtml;
    document.body.appendChild(temporaryElement);

    try {
      scannedBlocks++;
      // Run the scan on the off-screen element.
      const axeResults = await axe.run(temporaryElement, runOptions);

      if (axeResults.violations.length > 0) {
        const violationsWithContext = axeResults.violations.map(
          (violation) => ({
            ...violation,
            blockName: block.name,
            blockClientId: block.clientId,
          })
        );
        allViolations.push(...violationsWithContext);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred.';
      errors.push(`"${block.name}" block: ${message}`);
    } finally {
      // Always clean up the element.
      if (temporaryElement.parentNode) {
        temporaryElement.parentNode.removeChild(temporaryElement);
      }
    }
  }

  return {
    totalBlocks: blocks.length,
    scannedBlocks,
    skippedBlocks,
    violations: allViolations,
    errors,
  };
}

const AccessibilityCheckerSidebar = () => {
  const activeWcagTags = useMemo(() => getConfiguredWcagTags(), []);
  const wcagLabelMap = useMemo(() => getAvailableWcagLabels(), []);
  const wcagLabelText = useMemo(() => {
    const text = formatWcagLabelList(activeWcagTags, wcagLabelMap);
    return text || 'All available WCAG guidelines';
  }, [activeWcagTags, wcagLabelMap]);
  const { postId, blocks } = useSelect((selectFn) => {
    const editorStore = selectFn('core/editor') as Record<string, any>;
    const blockStore = selectFn('core/block-editor') as Record<string, any>;

    return {
      postId: editorStore?.getCurrentPostId
        ? editorStore.getCurrentPostId()
        : null,
      blocks: blockStore?.getBlocks ? blockStore.getBlocks() : [],
    };
  }, []);

  const headerSlot = useHeaderButtonSlot();

  const contentSnapshot = useMemo(() => serialize(blocks), [blocks]);
  const storageKey = useMemo(() => getStorageKey(postId), [postId]);

  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<ScanMetrics | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [storedScan, setStoredScan] = useState<StoredScan | null>(null);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    const saved = loadStoredScan(storageKey);
    setStoredScan(saved);
    if (saved) {
      setScanSummary(saved);
      setCompletedAt(new Date(saved.completedAt));
    }
  }, [storageKey]);

  const isScanStale = useMemo(() => {
    if (!storedScan) {
      return true;
    }
    return storedScan.contentHash !== contentSnapshot;
  }, [storedScan, contentSnapshot]);

  const announceNotice = (
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    options: Record<string, unknown> = {}
  ) => {
    const noticeStore = dispatch('core/notices') as Record<string, any>;
    if (!noticeStore?.createNotice) {
      return;
    }
    if (noticeStore.removeNotice) {
      noticeStore.removeNotice(SCAN_NOTICE_ID);
    }
    noticeStore.createNotice(type, message, {
      id: SCAN_NOTICE_ID,
      ...options,
    });
  };

  const handleScanClick = async () => {
    setIsScanning(true);
    setRunError(null);
    announceNotice('info', 'Running accessibility scan…', {
      isDismissible: false,
    });

    try {
      const results = await runClientSideScan();
      setScanSummary(results);
      const completedDate = new Date();
      setCompletedAt(completedDate);

      if (storageKey) {
        const persisted: StoredScan = {
          ...results,
          completedAt: completedDate.toISOString(),
          contentHash: contentSnapshot,
        };
        setStoredScan(persisted);
        saveStoredScan(storageKey, persisted);
      }

      openResultsPanel();

      if (results.violations.length > 0) {
        announceNotice(
          'warning',
          `Accessibility scan complete. Found ${
            results.violations.length
          } violation${results.violations.length === 1 ? '' : 's'}.`,
          { isDismissible: true }
        );
      } else {
        announceNotice(
          'success',
          'Accessibility scan complete. No violations detected.',
          { isDismissible: true }
        );
      }
    } catch (error) {
      setRunError(
        'Unable to complete the accessibility scan. Please try again.'
      );
      // Surface the full error to the console for debugging.
      // eslint-disable-next-line no-console
      console.error('Accessibility scan failed', error);
      openResultsPanel();
      announceNotice(
        'error',
        'Accessibility scan failed. Check the console for details and try again.',
        { isDismissible: true }
      );
    } finally {
      setIsScanning(false);
    }
  };

  const violationsByBlock = useMemo(() => {
    if (!scanSummary) {
      return [];
    }

    const grouped: Record<
      string,
      { label: string; violations: ViolationWithContext[] }
    > = {};

    scanSummary.violations.forEach((violation, index) => {
      const label = violation.blockName || 'Unknown block';
      const key = violation.blockClientId || `${label}-${index}`;

      if (!grouped[key]) {
        grouped[key] = { label, violations: [] };
      }
      grouped[key].violations.push(violation);
    });

    return Object.entries(grouped).map(([key, value]) => ({
      key,
      ...value,
    }));
  }, [scanSummary]);

  const blockViolationTotals = useMemo(() => {
    if (!scanSummary) {
      return {};
    }

    return scanSummary.violations.reduce<Record<string, number>>(
      (acc, violation) => {
        if (!violation.blockClientId) {
          return acc;
        }

        acc[violation.blockClientId] = (acc[violation.blockClientId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [scanSummary]);

  const blockViolationDetails = useMemo(() => {
    if (!scanSummary) {
      return {};
    }

    return scanSummary.violations.reduce<
      Record<string, ViolationWithContext[]>
    >(
      (acc, violation) => {
        if (!violation.blockClientId) {
          return acc;
        }
        if (!acc[violation.blockClientId]) {
          acc[violation.blockClientId] = [];
        }
        acc[violation.blockClientId].push(violation);
        return acc;
      },
      {} as Record<string, ViolationWithContext[]>
    );
  }, [scanSummary]);

  useEffect(() => {
    const storeDispatch = dispatch(STORE_NAME) as
      | Record<string, any>
      | undefined;
    storeDispatch?.setBlockViolations?.(
      blockViolationTotals,
      blockViolationDetails
    );
  }, [blockViolationTotals, blockViolationDetails]);

  return (
    <Fragment>
      {headerSlot ? (
        createPortal(
          <Button
            className="wpav-header-button__trigger"
            icon={<Icon icon={universalAccessIcon} />}
            label="Run accessibility scan"
            aria-label="Run accessibility scan"
            onClick={handleScanClick}
            disabled={isScanning}
          />,
          headerSlot
        )
      ) : (
        <PluginPostStatusInfo className="wpav-post-status-action">
          <div className="wpav-post-status-action__controls">
            <Button
              icon={<Icon icon={universalAccessIcon} />}
              label="Run accessibility scan"
              aria-label="Run accessibility scan"
              onClick={handleScanClick}
              disabled={isScanning}
            />
            {isScanning && <Spinner />}
          </div>
        </PluginPostStatusInfo>
      )}
      <PluginDocumentSettingPanel
        name={PANEL_NAME}
        title="Accessibility Checker"
        icon={<Icon icon={universalAccessIcon} />}
        className="wpav-panel"
      >
        <div className="wpav-panel__notices">
          {isScanning && (
            <Notice status="info" isDismissible={false}>
              Running accessibility scan…
            </Notice>
          )}

          {runError && (
            <Notice status="error" isDismissible={false}>
              {runError}
            </Notice>
          )}
        </div>
        <div className="wpav-panel__filters">
          <p>
            <strong>Active WCAG filters:</strong> {wcagLabelText}
          </p>
        </div>
        <div className="wpav-panel__content">
          {scanSummary ? (
            <>
              <div className="wpav-summary">
                <p>
                  <strong>Total blocks:</strong> {scanSummary.totalBlocks}
                </p>
                <p>
                  <strong>Scanned:</strong> {scanSummary.scannedBlocks}
                </p>
                <p>
                  <strong>Skipped:</strong> {scanSummary.skippedBlocks}
                </p>
                <p>
                  <strong>Violations:</strong> {scanSummary.violations.length}
                </p>
                {completedAt && (
                  <p>
                    <strong>Last run:</strong>{' '}
                    {completedAt.toLocaleTimeString()}
                  </p>
                )}
              </div>

              {storedScan && isScanStale && (
                <Notice status="info" isDismissible={false}>
                  The post has changed since the last scan. Run the checker
                  again to refresh these results.
                </Notice>
              )}

              {scanSummary.violations.length === 0 ? (
                <Notice status="success" isDismissible={false}>
                  No accessibility violations were detected in the scanned
                  blocks.
                </Notice>
              ) : (
                <>
                  <Notice status="warning" isDismissible={false}>
                    Found {scanSummary.violations.length} violation
                    {scanSummary.violations.length === 1 ? '' : 's'} across{' '}
                    {violationsByBlock.length} block
                    {violationsByBlock.length === 1 ? '' : 's'}.
                  </Notice>

                  {violationsByBlock.map(
                    ({ key, label, violations: blockViolations }) => (
                      <PanelBody
                        key={key}
                        title={`${label} (${blockViolations.length})`}
                        initialOpen={false}
                      >
                        {blockViolations.map((violation, index) => (
                          <Card
                            key={`${violation.id}-${index}`}
                            data-wpav-violation-id={violation.id}
                          >
                            <CardBody>
                              <p>
                                <strong>{violation.help}</strong>
                              </p>
                              <p>{violation.description}</p>
                              <p>
                                <strong>Impact:</strong>{' '}
                                {violation.impact || 'Not provided'}
                              </p>
                              <div>
                                <strong>Affected elements:</strong>
                                <ul>
                                  {violation.nodes.map((node, nodeIndex) => (
                                    <li key={nodeIndex}>
                                      <code>
                                        {node.target?.join(' ') ||
                                          node.html ||
                                          'Unknown'}
                                      </code>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className="wpav-card-actions">
                                <Button
                                  onClick={() =>
                                    focusBlockById(violation.blockClientId)
                                  }
                                  variant="primary"
                                >
                                  Go to block
                                </Button>
                                <Button
                                  href={violation.helpUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  variant="secondary"
                                >
                                  View fix guidance
                                </Button>
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </PanelBody>
                    )
                  )}
                </>
              )}

              {scanSummary.errors.length > 0 && (
                <Notice status="info" isDismissible={false}>
                  <strong>Some blocks were skipped:</strong>
                  <ul>
                    {scanSummary.errors.map((message, index) => (
                      <li key={index}>{message}</li>
                    ))}
                  </ul>
                </Notice>
              )}
            </>
          ) : (
            <p>Run the accessibility checker to view results.</p>
          )}
        </div>
      </PluginDocumentSettingPanel>

      <PluginPrePublishPanel
        title="Accessibility scan status"
        icon={<Icon icon={universalAccessIcon} />}
      >
        {scanSummary ? (
          <>
            {storedScan && isScanStale ? (
              <Notice status="warning" isDismissible={false}>
                The most recent accessibility scan is out of date. Run it again
                before publishing.
              </Notice>
            ) : (
              <p>
                Latest scan completed{' '}
                {completedAt ? completedAt.toLocaleTimeString() : 'recently'}.
              </p>
            )}
            <p>
              Detected {scanSummary.violations.length} violation
              {scanSummary.violations.length === 1 ? '' : 's'}.
            </p>
          </>
        ) : (
          <p>
            Run the accessibility checker to view results prior to publishing.
          </p>
        )}
      </PluginPrePublishPanel>
    </Fragment>
  );
};

// Register the plugin with WordPress.
registerPlugin('wp-accessibility-validator', {
  render: AccessibilityCheckerSidebar,
});
