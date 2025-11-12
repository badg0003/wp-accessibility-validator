/**
 * Custom hook for running accessibility scans.
 */

import { useState, useCallback } from '@wordpress/element';
import type { ScanMetrics, StoredScan } from '../types';
import { runClientSideScan, runPreviewScan, announceNotice, openResultsPanel } from '../utils';

interface UseAccessibilityScanOptions {
	onScanComplete?: (scan: ScanMetrics) => void;
	contentSnapshot: string;
	persistScan?: (scan: StoredScan) => void;
	previewUrl?: string;
}

/**
 * Hook for managing the accessibility scan lifecycle.
 *
 * @param options - Configuration options.
 * @returns Scan state and handlers.
 */
export const useAccessibilityScan = ({
	onScanComplete,
	contentSnapshot,
	persistScan,
	previewUrl,
}: UseAccessibilityScanOptions) => {
	const [isScanning, setIsScanning] = useState(false);
	const [scanSummary, setScanSummary] = useState<ScanMetrics | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [completedAt, setCompletedAt] = useState<Date | null>(null);

	const handleScanClick = useCallback(async () => {
		setIsScanning(true);
		setRunError(null);
		
		announceNotice('info', 'Running preview accessibility scan…', {
			isDismissible: false,
		});

		try {
			if (!previewUrl) {
				throw new Error('Preview URL is required for scanning');
			}

			const results = await runPreviewScan(previewUrl);
			setScanSummary(results);
			const completedDate = new Date();
			setCompletedAt(completedDate);

			// Persist the scan if a persist function is provided
			if (persistScan) {
				const persisted: StoredScan = {
					...results,
					completedAt: completedDate.toISOString(),
					contentHash: contentSnapshot,
				};
				persistScan(persisted);
			}

			openResultsPanel();

			if (results.violations.length > 0) {
				announceNotice(
					'warning',
					`Accessibility scan complete. Found ${results.violations.length} violation${
						results.violations.length === 1 ? '' : 's'
					}.`,
					{ isDismissible: true }
				);
			} else {
				announceNotice(
					'success',
					'Accessibility scan complete. No violations detected.',
					{ isDismissible: true }
				);
			}

			onScanComplete?.(results);
		} catch (error) {
			const errorMessage =
				'Unable to complete the accessibility scan. Please try again.';
			setRunError(errorMessage);

			// Surface the full error to the console for debugging
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
	}, [contentSnapshot, onScanComplete, persistScan, previewUrl]);

	return {
		isScanning,
		scanSummary,
		runError,
		completedAt,
		handleScanClick,
		setScanSummary,
		setCompletedAt,
	};
};
