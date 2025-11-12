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
	scanMode?: 'blocks' | 'preview';
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
	scanMode = 'blocks',
	previewUrl,
}: UseAccessibilityScanOptions) => {
	const [isScanning, setIsScanning] = useState(false);
	const [scanSummary, setScanSummary] = useState<ScanMetrics | null>(null);
	const [runError, setRunError] = useState<string | null>(null);
	const [completedAt, setCompletedAt] = useState<Date | null>(null);

	const handleScanClick = useCallback(async () => {
		setIsScanning(true);
		setRunError(null);
		
		const scanType = scanMode === 'preview' ? 'preview' : 'block';
		announceNotice('info', `Running ${scanType} accessibility scan…`, {
			isDismissible: false,
		});

		try {
			let results: ScanMetrics;

			if (scanMode === 'preview' && previewUrl) {
				results = await runPreviewScan(previewUrl);
			} else {
				results = await runClientSideScan();
			}
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
	}, [contentSnapshot, onScanComplete, persistScan, scanMode, previewUrl]);

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
