/**
 * Accessibility scanner using axe-core.
 */

import axe from 'axe-core';
import type { RunOptions } from 'axe-core';
import { serialize } from '@wordpress/blocks';
import { select } from '@wordpress/data';

import type { ScanMetrics, ViolationWithContext, WPBlock, WPBlockEditorStore } from '../types';
import { getConfiguredWcagTags } from './wcag';
import { createScanElement } from './dom';

/**
 * Determines if a block should be skipped during scanning.
 *
 * @param html - The serialized HTML of the block.
 * @returns True if the block should be skipped.
 */
const shouldSkipBlock = (html: string): boolean => {
	if (html.trim().length === 0) {
		return true;
	}

	// Skip certain dynamic blocks that don't render properly in isolation
	if (html.startsWith('<!-- wp:latest-posts')) {
		return true;
	}

	return false;
};

/**
 * Scans a single block for accessibility violations.
 *
 * @param block - The WordPress block to scan.
 * @param runOptions - Axe-core run options.
 * @returns An object containing violations and any error that occurred.
 */
const scanBlock = async (
	block: WPBlock,
	runOptions: RunOptions
): Promise<{ violations: ViolationWithContext[]; error?: string }> => {
	const renderedHtml = serialize([block as any]);

	if (shouldSkipBlock(renderedHtml)) {
		return { violations: [] };
	}

	const cleanup = createScanElement(renderedHtml);

	try {
		const element = document.body.lastElementChild as HTMLElement;
		const axeResults = await axe.run(element, runOptions);

		const violationsWithContext = axeResults.violations.map((violation) => ({
			...violation,
			blockName: block.name,
			blockClientId: block.clientId,
		}));

		return { violations: violationsWithContext };
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'An unexpected error occurred.';
		return {
			violations: [],
			error: `"${block.name}" block: ${message}`,
		};
	} finally {
		cleanup();
	}
};

/**
 * Runs a client-side accessibility scan on all blocks in the editor.
 *
 * @returns A promise that resolves with scan metrics.
 */
export const runClientSideScan = async (): Promise<ScanMetrics> => {
	const blockStore = select('core/block-editor') as Partial<WPBlockEditorStore>;
	const blocks = blockStore?.getBlocks?.() ?? [];

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
		const renderedHtml = serialize([block as any]);

		if (shouldSkipBlock(renderedHtml)) {
			skippedBlocks++;
			continue;
		}

		scannedBlocks++;
		const result = await scanBlock(block, runOptions);

		if (result.error) {
			errors.push(result.error);
		}

		if (result.violations.length > 0) {
			allViolations.push(...result.violations);
		}
	}

	return {
		totalBlocks: blocks.length,
		scannedBlocks,
		skippedBlocks,
		violations: allViolations,
		errors,
	};
};
