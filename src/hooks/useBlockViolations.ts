/**
 * Custom hook for tracking block violations.
 */

import { useMemo, useEffect } from '@wordpress/element';
import { dispatch } from '@wordpress/data';
import type { ScanMetrics, ViolationWithContext } from '../types';
import { STORE_NAME } from '../constants';

/**
 * Processes scan results to group violations by block.
 *
 * @param scanSummary - The scan results.
 * @returns Grouped violation data.
 */
export const useBlockViolations = (scanSummary: ScanMetrics | null) => {
	// Group violations by block for display
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
