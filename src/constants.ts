/**
 * Constants for the WP Accessibility Validator plugin.
 */

import type { ImpactMeta, ViolationWithContext } from './types';

/**
 * Storage key prefix for localStorage.
 */
export const STORAGE_PREFIX = 'wpav-scan-';

/**
 * Notice ID for scan status notifications.
 */
export const SCAN_NOTICE_ID = 'wpav-scan-status';

/**
 * Panel name for the document settings panel.
 */
export const PANEL_NAME = 'wp-accessibility-validator-panel';

/**
 * Store ID for the panel in the editor.
 */
export const PANEL_STORE_ID = `plugin-document-setting-panel/${PANEL_NAME}`;

/**
 * Store name for the violation tracking store.
 */
export const STORE_NAME = 'wpav/accessibility';

/**
 * Default WCAG tags to use if none are configured.
 */
export const DEFAULT_WCAG_TAGS = [
	'wcag2a',
	'wcag2aa',
	'wcag2aaa',
	'wcag21a',
	'wcag21aa',
	'wcag22aa',
];

/**
 * Impact level metadata for styling and labels.
 */
export const IMPACT_META: Record<
	NonNullable<ViolationWithContext['impact']>,
	ImpactMeta
> = {
	critical: { color: '#d63638', label: 'Critical impact' },
	serious: { color: '#c9356e', label: 'Serious impact' },
	moderate: { color: '#f0b849', label: 'Moderate impact' },
	minor: { color: '#58a942', label: 'Minor impact' },
};

/**
 * CSS selectors for the editor header settings area.
 */
export const HEADER_SETTINGS_SELECTORS = [
	'.editor-header__settings',
	'.edit-post-header__settings',
];

/**
 * CSS selectors for the publish button.
 */
export const PUBLISH_BUTTON_SELECTORS = [
	'.editor-post-publish-button__button',
	'.editor-post-publish-button',
];

/**
 * Delay in milliseconds before removing highlight from violations.
 */
export const HIGHLIGHT_DURATION = 2000;

/**
 * CSS class names used throughout the plugin.
 */
export const CSS_CLASSES = {
	headerButton: 'wpav-header-button',
	headerButtonTrigger: 'wpav-header-button__trigger',
	postStatusAction: 'wpav-post-status-action',
	postStatusControls: 'wpav-post-status-action__controls',
	panel: 'wpav-panel',
	panelNotices: 'wpav-panel__notices',
	panelFilters: 'wpav-panel__filters',
	panelContent: 'wpav-panel__content',
	summary: 'wpav-summary',
	cardActions: 'wpav-card-actions',
	toolbarDropdown: 'wpav-toolbar-dropdown',
	toolbarDropdownContent: 'wpav-toolbar-dropdown__content',
	blockFlagged: 'wpav-block--flagged',
	highlight: 'wpav-highlight',
} as const;

/**
 * Data attribute names.
 */
export const DATA_ATTRIBUTES = {
	violationId: 'data-wpav-violation-id',
	blockHasViolations: 'data-wpav-block-has-violations',
	violationLabel: 'data-wpav-violation-label',
} as const;
