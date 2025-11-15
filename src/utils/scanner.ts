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
  RenderResponse,
} from '../types';
import { getConfiguredWcagTags } from './wcag';
import {
  createScanIframe,
  buildScanDocumentHtml,
  waitForIframeLoad,
} from './previewDom';
import apiFetch from '@wordpress/api-fetch';

/**
 * Injects axe-core into the iframe and resolves when it is available.
 *
 * @since 1.0.0
 *
 * @param {Document} iframeDoc Document of the scan iframe.
 * @return {Promise<void>} Resolves once axe-core has loaded.
 */
const loadAxeIntoIframe = async (iframeDoc: Document): Promise<void> => {
  const axeScript = iframeDoc.createElement('script');
  axeScript.src = 'https://cdn.jsdelivr.net/npm/axe-core@4.9.1/axe.min.js';
  iframeDoc.head.appendChild(axeScript);

  await new Promise<void>((resolve) => {
    axeScript.onload = () => resolve();
  });
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
 * @param {WPBlock[]} blocks The blocks to scan.
 * @return {Promise<ScanMetrics>} A promise that resolves with scan metrics.
 *
 * @throws {Error} If the preview cannot be loaded, the iframe cannot be
 *                 accessed due to CORS, axe-core fails to load, or the
 *                 scan process encounters an unexpected error.
 */
export const runPreviewScan = async (
  blocks: WPBlock[]
): Promise<ScanMetrics> => {
  if (typeof document === 'undefined') {
    throw new Error('Preview scanning is only available in a browser context.');
  }

  const { themeStylesheetUrl, globalStylesCss } =
    (window as any).wpavSettings || {};

  const editorStore = select('core/editor') as any;
  const postId = editorStore?.getCurrentPostId?.();
  const content = editorStore?.getEditedPostAttribute?.('content');

  if (!postId) {
    throw new Error(
      'Cannot run preview scan: no current post ID is available.'
    );
  }

  if (typeof content !== 'string') {
    throw new Error('Cannot run preview scan: post content is not available.');
  }

  // Track iframe so it can always be cleaned up in a finally block.
  let iframe: HTMLIFrameElement | null = null;

  try {
    iframe = createScanIframe();
    // Attach iframe to the DOM so load events and scripts behave consistently.
    document.body.appendChild(iframe);

    let response: RenderResponse;

    try {
      response = await apiFetch({
        path: `/wp-accessibility-validator/v1/render/${postId}`,
        method: 'POST',
        data: { content },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('A11y render request failed', error);
      throw new Error('Failed to render preview HTML for accessibility scan.');
    }

    if (!iframe) {
      throw new Error('Failed to create preview iframe');
    }

    const docHtml = buildScanDocumentHtml({
      html: response.html,
      lang: document.documentElement.lang || 'en',
      themeStylesheetUrl,
      globalStylesCss,
    });

    iframe.srcdoc = docHtml;

    await waitForIframeLoad(iframe);

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

    // Inject axe-core into the iframe and wait for it to be ready.
    await loadAxeIntoIframe(iframeDoc);

    // Run axe-core on the iframe document with the configured tags.
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

    // Debug: full set of raw axe results before filtering.
    // eslint-disable-next-line no-console
    // console.log('WPAV axe raw results:', allResults);

    const filteredViolations = allResults
      .map((violation: any) => {
        const filteredNodes = violation.nodes.filter(
          (node: any, idx: number) => {
            // 1. Fast path: if the node HTML already contains a block id, keep it.
            if (
              typeof node.html === 'string' &&
              /data-wpav-block-id="[^"]+"/.test(node.html)
            ) {
              return true;
            }

            // 2. Fallback: use node.target selectors + DOM lookup.
            const targets = Array.isArray(node.target) ? node.target : [];

            for (const targetSelector of targets) {
              try {
                const targetElements =
                  iframeDoc.querySelectorAll(targetSelector);

                for (const targetElement of Array.from(targetElements)) {
                  let parent: Element | null = targetElement;

                  while (parent) {
                    if (
                      (parent as HTMLElement).hasAttribute &&
                      (parent as HTMLElement).hasAttribute('data-wpav-block-id')
                    ) {
                      return true; // inside one of our blocks
                    }
                    parent = parent.parentElement;
                  }
                }
              } catch {
                // Invalid selector? Just move on to the next one.
                continue;
              }
            }

            // None of this node's targets were inside a block
            return false;
          }
        );

        return {
          ...violation,
          nodes: filteredNodes,
        };
      })
      .filter((violation) => violation.nodes.length > 0);

    // Map violations back to actual block clientIds based on data-wpav-block-id.
    // Some axe violations can have multiple nodes that live in different blocks,
    // so we expand each violation into one entry per (block, node) pair.
    const violationsWithBlockIds = filteredViolations.flatMap(
      (violation: any) => {
        const nodeEntries = violation.nodes.map((node: any) => {
          let blockId: string | null = null;

          // Try to resolve the block id using the node's targets in the iframe DOM.
          const targets = Array.isArray(node.target) ? node.target : [];

          for (const selector of targets) {
            let elements: NodeListOf<Element>;
            try {
              elements = iframeDoc.querySelectorAll(selector);
            } catch {
              // Bad selector, skip to the next one.
              continue;
            }

            for (const el of Array.from(elements)) {
              let parent: Element | null = el;

              while (parent) {
                const parentEl = parent as HTMLElement;
                if (
                  parentEl.hasAttribute &&
                  parentEl.hasAttribute('data-wpav-block-id')
                ) {
                  blockId = parentEl.getAttribute('data-wpav-block-id');
                  break;
                }
                parent = parent.parentElement;
              }

              if (blockId) {
                break;
              }
            }

            if (blockId) {
              break;
            }
          }

          // Fallback: extract the block id directly from the node HTML snippet.
          if (!blockId && typeof node.html === 'string') {
            const match = node.html.match(/data-wpav-block-id="([^\"]*)"/);
            if (match) {
              blockId = match[1];
            }
          }

          if (!blockId) {
            return null;
          }

          const matchingBlock = blocks.find(
            (block: WPBlock) => block.attributes?.wpavId === blockId
          );

          if (!matchingBlock) {
            return null;
          }

          // Return a violation instance scoped to this block and node.
          const scopedViolation: ViolationWithContext = {
            ...violation,
            nodes: [node],
            blockName: matchingBlock.name,
            blockClientId: matchingBlock.clientId,
          };

          return scopedViolation;
        });

        return nodeEntries.filter(
          (entry: ViolationWithContext | null): entry is ViolationWithContext =>
            entry !== null
        );
      }
    );

    // Build and return scan metrics summarizing the mapped violations.
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
