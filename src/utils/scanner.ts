/**
 * Accessibility scanner using axe-core.
 */

import axe from 'axe-core';
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
 * Uses block index/position for stable identification.
 *
 * @param block - The WordPress block.
 * @returns A stable identifier for the block.
 */
const generateBlockStableId = (block: WPBlock): string => {
  return md5(block.originalContent).substring(0, 12);
};

/**
 * Runs a client-side accessibility scan on all blocks in the editor.
 *
 * @deprecated Use runPreviewScan instead for more accurate results
 * @returns A promise that resolves with scan metrics.
 */
export const runClientSideScan = async (): Promise<ScanMetrics> => {
  throw new Error(
    'Client-side block scanning is no longer supported. Use preview scanning instead.'
  );
};

export const runPreviewScan = async (
  previewUrl: string
): Promise<ScanMetrics> => {
  // Get current editor blocks for ID comparison
  const blockStore = select('core/block-editor') as Partial<WPBlockEditorStore>;
  const blocks = blockStore?.getBlocks?.() ?? [];

  console.log('Starting preview page scan...', {
    previewUrl,
    blockCount: blocks.length,
  });

  try {
    // Create iframe to load preview page
    const iframe = document.createElement('iframe');
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
      iframe.onload = () => {
        console.log('Preview iframe loaded successfully');
        resolve();
      };
      iframe.onerror = (e) => {
        console.error('Preview iframe failed to load:', e);
        reject(new Error('Failed to load preview page'));
      };
      // Timeout after 15 seconds
      setTimeout(() => reject(new Error('Preview page load timeout')), 15000);
    });

    // Check if we can access the iframe content
    let iframeDoc: Document;
    try {
      iframeDoc =
        iframe.contentDocument || (iframe.contentWindow as any)?.document;
      if (!iframeDoc) {
        throw new Error('Cannot access iframe document');
      }
      console.log('Successfully accessed iframe document');
    } catch (error) {
      console.error('Cannot access iframe content, likely CORS issue:', error);
      document.body.removeChild(iframe);
      throw new Error(
        'Cannot access preview page content due to CORS restrictions'
      );
    }

    // Check if the iframe content has our block IDs
    const blockElements = iframeDoc.querySelectorAll('[data-wpav-block-id]');
    console.log('Found block elements in iframe:', blockElements.length);

    // Debug: Log all block IDs found in preview
    const previewBlockIds = Array.from(blockElements).map((el: Element) =>
      el.getAttribute('data-wpav-block-id')
    );
    console.log('Block IDs found in preview:', previewBlockIds);

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
    const iframeAxe = (iframe.contentWindow as any).axe;
    if (!iframeAxe) {
      throw new Error('Failed to load axe-core in iframe');
    }

    const axeResults = await iframeAxe.run(iframeDoc, runOptions);
    console.log('Axe-core results:', {
      violations: axeResults.violations.length,
      passes: axeResults.passes.length,
      incomplete: axeResults.incomplete.length,
      inapplicable: axeResults.inapplicable.length,
    });

    // Log color contrast results from all categories
    const colorContrastResults = {
      violations: axeResults.violations.filter(
        (v: any) => v.id === 'color-contrast'
      ),
      passes: axeResults.passes.filter((p: any) => p.id === 'color-contrast'),
      incomplete: axeResults.incomplete.filter(
        (i: any) => i.id === 'color-contrast'
      ),
      inapplicable: axeResults.inapplicable.filter(
        (ia: any) => ia.id === 'color-contrast'
      ),
    };

    console.log('Color contrast results:', {
      violations: colorContrastResults.violations.length,
      passes: colorContrastResults.passes.length,
      incomplete: colorContrastResults.incomplete.length,
      inapplicable: colorContrastResults.inapplicable.length,
    });

    // Log details of incomplete color contrast results
    if (colorContrastResults.incomplete.length > 0) {
      console.log('Incomplete color contrast results:');
      colorContrastResults.incomplete.forEach((result: any, index: number) => {
        console.log(`Incomplete ${index + 1}:`, result.description);
        console.log('Element:', result.nodes[0]?.html);
        console.log('Selector:', result.nodes[0]?.target?.[0]);
        console.log('Reason:', result.nodes[0]?.any[0]?.message);
      });
    }

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

    console.log(
      'Filtered to',
      filteredViolations.length,
      'violations affecting our blocks',
      filteredViolations
    );

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

    // Log all violations found (filtered)
    console.log(
      '=== PREVIEW PAGE ACCESSIBILITY VIOLATIONS (Block Content Only) ===',
      violationsWithBlockIds
    );

    // Clean up
    document.body.removeChild(iframe);
    console.log('Preview scan completed successfully');

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
  }
};
