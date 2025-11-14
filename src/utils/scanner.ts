/**
 * Accessibility scanner using axe-core.
 *
 * Provides utilities for running accessibility scans against the rendered
 * preview of the current post using axe-core, and mapping the resulting
 * violations back to individual blocks in the editor.
 *
 * @package WPAccessibilityValidator
 */

import type { RunOptions } from 'axe-core';
import { select } from '@wordpress/data';

import type {
  ScanMetrics,
  ViolationWithContext,
  WPBlock,
  WPBlockEditorStore,
} from '../types';
import { getConfiguredWcagTags } from './wcag';
import { md5 } from 'js-md5';

/**
 * Generates a stable ID for a block that can be used to correlate
 * blocks between the editor and rendered preview.
 *
 * Uses a hash of the block's original content to derive a deterministic
 * identifier that is stable across editor and preview renders for the
 * same content.
 *
 * @since 1.0.0
 *
 * @param {WPBlock} block The WordPress block.
 * @return {string} A stable identifier for the block.
 */
const generateBlockStableId = (block: WPBlock): string => {
  return md5(block.originalContent).substring(0, 12);
};

/**
 * Runs a client-side accessibility scan on all blocks in the editor.
 *
 * This function is retained for backwards compatibility but is no longer
 * supported. It will always throw an error when called.
 *
 * @since 1.0.0
 * @deprecated Use {@link runPreviewScan} instead for more accurate results.
 *
 * @return {Promise<ScanMetrics>} A promise that always rejects.
 */
export const runClientSideScan = async (): Promise<ScanMetrics> => {
  throw new Error(
    'Client-side block scanning is no longer supported. Use preview scanning instead.'
  );
};

/**
 * Runs an accessibility scan against the rendered preview page.
 *
 * Loads the post preview into an off-screen iframe, injects axe-core,
 * filters the resulting violations to those that affect blocks tagged
 * with `data-wpav-block-id`, and maps violations back to editor blocks.
 *
 * @since 1.0.0
 *
 * @param {string} previewUrl The URL of the preview page to scan.
 * @return {Promise<ScanMetrics>} A promise that resolves with scan metrics.
 *
 * @throws {Error} If the preview cannot be loaded, the iframe cannot be
 *                 accessed due to CORS, axe-core fails to load, or the
 *                 scan process encounters an unexpected error.
 */
export const runPreviewScan = async (
  previewUrl: string
): Promise<ScanMetrics> => {
  if (typeof document === 'undefined') {
    throw new Error('Preview scanning is only available in a browser context.');
  }

  // Get current editor blocks for ID comparison
  const blockStore = select('core/block-editor') as Partial<WPBlockEditorStore>;
  const blocks = blockStore?.getBlocks?.() ?? [];

  // Track iframe so it can always be cleaned up in a finally block.
  let iframe: HTMLIFrameElement | null = null;

  try {
    // Create iframe to load preview page
    iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-10000px';
    iframe.style.top = 'auto';
    iframe.style.width = '1200px'; // Give it width for proper rendering
    iframe.style.height = '800px'; // Give it height for proper rendering
    iframe.style.overflow = 'hidden';
    iframe.style.border = 'none';
    iframe.src = previewUrl;

    document.body.appendChild(iframe);

    // Wait for iframe to load
    await new Promise<void>((resolve, reject) => {
      if (!iframe) {
        reject(new Error('Failed to create preview iframe'));
        return;
      }

      const timeoutId = window.setTimeout(() => {
        if (iframe) {
          iframe.onload = null;
          iframe.onerror = null;
        }
        reject(new Error('Preview page load timeout'));
      }, 15000);

      iframe.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };

      iframe.onerror = (e) => {
        clearTimeout(timeoutId);
        console.error('Preview iframe failed to load:', e);
        reject(new Error('Failed to load preview page'));
      };
    });

    // Check if we can access the iframe content
    let iframeDoc: Document;
    try {
      if (!iframe) {
        throw new Error('Preview iframe is not available');
      }

      iframeDoc =
        iframe.contentDocument || (iframe.contentWindow as any)?.document;
      if (!iframeDoc) {
        throw new Error('Cannot access iframe document');
      }
    } catch (error) {
      console.error('Cannot access iframe content, likely CORS issue:', error);
      throw new Error(
        'Cannot access preview page content due to CORS restrictions'
      );
    }

    // Check if the iframe content has our block IDs
    const blockElements = iframeDoc.querySelectorAll('[data-wpav-block-id]');

    // Inject axe-core into the iframe
    const axeScript = iframeDoc.createElement('script');
    axeScript.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js';
    iframeDoc.head.appendChild(axeScript);

    // Wait for axe to load
    await new Promise<void>((resolve) => {
      axeScript.onload = () => resolve();
    });

    // Run axe-core on the iframe document
    const wcagTags = getConfiguredWcagTags();
    const runOptions: RunOptions = {
      resultTypes: ['violations', 'incomplete'],
    };

    if (wcagTags.length > 0) {
      runOptions.runOnly = {
        type: 'tag',
        values: wcagTags,
      };
    }

    // Access axe from the iframe context
    if (!iframe || !iframe.contentWindow) {
      throw new Error('Preview iframe window is not available');
    }

    const iframeAxe = (iframe.contentWindow as any).axe;
    if (!iframeAxe) {
      throw new Error('Failed to load axe-core in iframe');
    }

    const axeResults = await iframeAxe.run(iframeDoc, runOptions);

    // Merge violations and incomplete results together
    const allResults = [...axeResults.violations, ...axeResults.incomplete];

    const filteredViolations = allResults
      .map((violation: any) => {
        const filteredNodes = violation.nodes.filter((node: any) => {
          // node.target is an array of selectors
          const targets = Array.isArray(node.target) ? node.target : [];

          for (const targetSelector of targets) {
            try {
              const targetElements = iframeDoc.querySelectorAll(targetSelector);

              for (const targetElement of Array.from(targetElements)) {
                let parent: Element | null = targetElement;

                while (parent) {
                  if (
                    (parent as HTMLElement).hasAttribute &&
                    (parent as HTMLElement).hasAttribute('data-wpav-block-id')
                  ) {
                    // This node is inside one of our blocks
                    return true;
                  }
                  parent = parent.parentElement;
                }
              }
            } catch (error) {
              // Invalid selector? Just ignore this targetSelector and move on.
              continue;
            }
          }

          // None of this node's targets were inside a block
          return false;
        });

        // Return a new violation object with only the relevant nodes
        return {
          ...violation,
          nodes: filteredNodes,
        };
      })
      // Only keep violations that still have at least one node
      .filter((violation) => violation.nodes.length > 0);

    // Map violations back to actual block clientIds based on data-wpav-block-id
    // Only include violations that can be mapped to actual editor blocks
    const violationsWithBlockIds = filteredViolations
      .map((violation: any) => {
        let blockId = null;
        for (const node of violation.nodes) {
          // Try to get the actual DOM element in the iframe
          let targetElement: Element | null = null;
          if (node.target && node.target.length > 0) {
            try {
              targetElement = iframeDoc.querySelector(node.target[0]);
            } catch (e) {
              // Invalid selector, skip
            }
          }
          if (targetElement) {
            // Walk up the DOM tree to find the nearest ancestor with data-wpav-block-id
            let parent: Element | null = targetElement;

            while (parent) {
              if (
                parent.hasAttribute &&
                parent.hasAttribute('data-wpav-block-id')
              ) {
                blockId = parent.getAttribute('data-wpav-block-id');
                break;
              }
              parent = parent.parentElement as Element | null;
            }
          } else if (node.html) {
            // Fallback: try to match in the HTML string
            const match = node.html.match(/data-wpav-block-id="([^"]*)"/);
            if (match) {
              blockId = match[1];
            }
          }
          if (blockId) break;
        }

        // Only include violations that can be mapped to actual editor blocks
        if (blockId) {
          const matchingBlock = blocks.find(
            (block: WPBlock, index: number) =>
              generateBlockStableId(block) === blockId
          );
          if (matchingBlock) {
            return {
              ...violation,
              blockName: matchingBlock.name,
              blockClientId: matchingBlock.clientId,
            };
          }
        }
        return null;
      })
      .filter(
        (
          violation: ViolationWithContext | null
        ): violation is ViolationWithContext => violation !== null
      );

    // Return scan metrics (using mapped violations)
    return {
      totalBlocks: blockElements.length,
      scannedBlocks: blockElements.length,
      skippedBlocks: 0,
      violations: violationsWithBlockIds,
      errors: [],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Preview scan failed';
    console.error('Preview scan error:', error);
    throw new Error(`Preview scan failed: ${message}`);
  } finally {
    if (iframe && iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
};
