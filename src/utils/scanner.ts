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
 * @param index - The block's position in the editor.
 * @returns A stable identifier for the block.
 */
const generateBlockStableId = (block: WPBlock, index: number): string => {
  // Use block position/index for stable ID generation
  return `wpav-block-${index}`;
};

/**
 * Runs a client-side accessibility scan on all blocks in the editor.
 *
 * @deprecated Use runPreviewScan instead for more accurate results
 * @returns A promise that resolves with scan metrics.
 */
export const runClientSideScan = async (): Promise<ScanMetrics> => {
	throw new Error('Client-side block scanning is no longer supported. Use preview scanning instead.');
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

    // Debug: Log block IDs from editor
    const editorBlockIds = blocks.map((block: WPBlock, index: number) =>
      generateBlockStableId(block, index)
    );
    console.log('Block IDs from editor:', editorBlockIds);

    // Debug: Log what we're hashing for each block
    blocks.forEach((block, index) => {
      const generatedId = generateBlockStableId(block, index);
      console.log(`Block ${index} (${block.name}):`, {
        clientId: block.clientId,
        generatedId: generatedId,
      });
    });

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

    console.log('ZZZ', axeResults);

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

    const filteredViolations = allResults.filter((violation: any) => {
      // Check if any of the violation's target elements are within our block elements
      for (const targetSelector of violation.nodes
        .map((node: any) => node.target)
        .flat()) {
        try {
          const targetElements = iframeDoc.querySelectorAll(targetSelector);
          for (const targetElement of targetElements) {
            // Check if this target element is within one of our block elements
            let parent = targetElement;
            while (parent) {
              if (
                parent.hasAttribute &&
                parent.hasAttribute('data-wpav-block-id')
              ) {
                return true; // This violation affects one of our blocks
              }
              parent = parent.parentElement;
            }
          }
        } catch (error) {
          // Skip invalid selectors
          continue;
        }
      }
      return false; // This violation doesn't affect any of our blocks
    });
    console.log(
      'Filtered to',
      filteredViolations.length,
      'violations affecting our blocks'
    );
    console.log(filteredViolations);
    // Map violations back to actual block clientIds based on data-wpav-block-id
    // Only include violations that can be mapped to actual editor blocks
    const violationsWithBlockIds = filteredViolations
      .map((violation: any) => {
        // Find the block ID from the violation's HTML
        let blockId = null;
        for (const node of violation.nodes) {
          if (node.html) {
            console.log(
              'Checking violation node HTML:',
              node.html.substring(0, 200) + '...'
            );
            const match = node.html.match(/data-wpav-block-id="([^"]*)"/);
            if (match) {
              blockId = match[1];
              console.log('Found block ID in violation:', blockId);
              break;
            } else {
              console.log('No data-wpav-block-id found in node HTML');
            }
          }
        }

        // Only include violations that can be mapped to actual editor blocks
        if (blockId) {
          const matchingBlock = blocks.find(
            (block: WPBlock, index: number) => generateBlockStableId(block, index) === blockId
          );
          console.log(blockId, matchingBlock);
          if (matchingBlock) {
            console.log(
              'Successfully mapped violation to block:',
              matchingBlock.name,
              matchingBlock.clientId
            );
            return {
              ...violation,
              blockName: matchingBlock.name,
              blockClientId: matchingBlock.clientId,
            };
          } else {
            console.log('No matching block found for ID:', blockId);
            console.log(
              'Available editor block IDs:',
              blocks.map((b, i) => generateBlockStableId(b, i))
            );
          }
        } else {
          console.log('No block ID found in violation nodes');
        }

        // Skip violations that can't be mapped to editor blocks
        return null;
      })
      .filter(
        (
          violation: ViolationWithContext | null
        ): violation is ViolationWithContext => violation !== null
      );

    // Log all violations found (filtered)
    console.log(
      '=== PREVIEW PAGE ACCESSIBILITY VIOLATIONS (Block Content Only) ==='
    );
    violationsWithBlockIds.forEach((violation: any, index: number) => {
      console.log(`\n--- Violation ${index + 1} ---`);
      console.log('Rule ID:', violation.id);
      console.log('Description:', violation.description);
      console.log('Help:', violation.help);
      console.log('Impact:', violation.impact);
      console.log('Help URL:', violation.helpUrl);
      console.log('Tags:', violation.tags);
      console.log(
        'Target selectors:',
        violation.nodes.map((node: any) => node.target)
      );
      console.log('HTML:', violation.nodes[0]?.html);
      console.log('Failure Summary:', violation.nodes[0]?.failureSummary);
      console.log('Mapped to block clientId:', violation.blockClientId);
    });

    // Specifically highlight color contrast issues
    const colorContrastViolations = violationsWithBlockIds.filter(
      (v: any) => v.id === 'color-contrast'
    );
    if (colorContrastViolations.length > 0) {
      console.log(
        `\n=== COLOR CONTRAST VIOLATIONS (${colorContrastViolations.length} found in blocks) ===`
      );
      colorContrastViolations.forEach((violation: any, index: number) => {
        console.log(`Color violation ${index + 1}:`, violation.help);
        console.log('Element:', violation.nodes[0]?.html);
        console.log('Selector:', violation.nodes[0]?.target?.[0]);
        console.log(
          'Block ID:',
          violation.nodes[0]?.html?.match(
            /data-wpav-block-id="([^"]*)"/
          )?.[1] || 'unknown'
        );
        console.log('Block clientId:', violation.blockClientId);
      });
    } else {
      console.log('\n=== NO COLOR CONTRAST VIOLATIONS FOUND IN BLOCKS ===');
    }

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
