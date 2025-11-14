/**
 * Block violations hook.
 *
 * Groups accessibility scan violations by block and syncs summary information
 * into the plugin data store for use by other UI components.
 *
 * @package WPAccessibilityValidator
 */

/**
 * Custom hook for tracking block violations.
 */

import { useMemo, useEffect } from '@wordpress/element';
import { dispatch } from '@wordpress/data';
import type { ScanMetrics, ViolationWithContext } from '../types';
import { STORE_NAME } from '../constants';

/**
 * Result shape for the block violations hook.
 *
 * @typedef {Object} UseBlockViolationsResult
 * @property {Array}  violationsByBlock      Array of grouped violations keyed by block.
 * @property {Object} blockViolationTotals   Map of block client ID to total violation count.
 * @property {Object} blockViolationDetails  Map of block client ID to detailed violation list.
 */
interface BlockViolationGroup {
  key: string;
  label: string;
  violations: ViolationWithContext[];
}

interface UseBlockViolationsResult {
  violationsByBlock: BlockViolationGroup[];
  blockViolationTotals: Record<string, number>;
  blockViolationDetails: Record<string, ViolationWithContext[]>;
}

/**
 * Hook for deriving and tracking block-level violations.
 *
 * Groups violations by block for display and calculates per-block totals
 * and details. When the grouped data changes, it is synchronized to the
 * plugin's custom data store so other components can consume it.
 *
 * @since 1.0.0
 *
 * @param {ScanMetrics|null} scanSummary Scan results for the current run,
 *                                       or null if no scan has been performed.
 * @return {UseBlockViolationsResult} Grouped violation data and maps keyed
 *                                    by block client ID.
 */
export const useBlockViolations = (
  scanSummary: ScanMetrics | null
): UseBlockViolationsResult => {
	// Group violations by block for display
	const violationsByBlock = useMemo<BlockViolationGroup[]>(() => {
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

	// Calculate total violations per block
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
			{}
		);
	}, [scanSummary]);

	// Group detailed violations by block
	const blockViolationDetails = useMemo(() => {
		if (!scanSummary) {
			return {};
		}

		return scanSummary.violations.reduce<
			Record<string, ViolationWithContext[]>
		>((acc, violation) => {
			if (!violation.blockClientId) {
				return acc;
			}
			if (!acc[violation.blockClientId]) {
				acc[violation.blockClientId] = [];
			}
			acc[violation.blockClientId].push(violation);
			return acc;
		}, {});
	}, [scanSummary]);

	// Update the violation store when violations change
	useEffect(() => {
		const storeDispatch = dispatch(STORE_NAME) as any;
		storeDispatch?.setBlockViolations?.(
			blockViolationTotals,
			blockViolationDetails
		);
	}, [blockViolationTotals, blockViolationDetails]);

	return {
		violationsByBlock,
		blockViolationTotals,
		blockViolationDetails,
	};
};
