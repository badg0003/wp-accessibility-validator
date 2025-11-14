/**
 * Accessibility scan hook.
 *
 * Provides a custom React hook for running accessibility scans against the
 * current post in the block editor. The hook is responsible for orchestrating
 * the scan lifecycle, including saving the post, requesting a fresh preview
 * URL, running the scan, and exposing the results and status to consumers.
 *
 * @package WPAccessibilityValidator
 */

import { useState, useCallback } from '@wordpress/element';
import type { ScanMetrics, StoredScan } from '../types';
import {
  runClientSideScan,
  runPreviewScan,
  announceNotice,
  openResultsPanel,
  savePostAndWait,
} from '../utils';

/**
 * Options for configuring the accessibility scan hook.
 *
 * @typedef {Object} UseAccessibilityScanOptions
 * @property {Function} [onScanComplete] Optional callback invoked when a scan
 *                                       has completed successfully.
 * @property {string}   contentSnapshot  Serialized content used to detect
 *                                       whether a stored scan is stale.
 * @property {Function} [persistScan]    Optional callback used to persist the
 *                                       completed scan metrics for later use.
 * @property {Function} getFreshPreviewUrl Function that returns a fresh
 *                                         preview URL for the current post,
 *                                         or null if one cannot be generated.
 */
interface UseAccessibilityScanOptions {
  onScanComplete?: (results: ScanMetrics) => void;
  contentSnapshot: string;
  persistScan?: (scan: StoredScan) => void;
  getFreshPreviewUrl: () => string | null;
}

/**
 * Hook for managing the accessibility scan lifecycle.
 *
 * Orchestrates the full scan flow for the current post, including:
 * saving the latest editor changes, resolving a fresh preview URL,
 * running the accessibility scan against that preview, and exposing
 * the resulting metrics and status to the caller.
 *
 * @since 1.0.0
 *
 * @param {UseAccessibilityScanOptions} options Configuration options for the hook.
 * @return {Object} Scan state and handlers.
 * @return {boolean} return.isScanning  Whether a scan is currently in progress.
 * @return {?ScanMetrics} return.scanSummary  The most recent scan metrics, or null
 *                                           if no scan has been completed.
 * @return {?string} return.runError   User-facing error message if the last scan
 *                                     failed, or null if there was no error.
 * @return {?Date} return.completedAt  Date instance representing when the last
 *                                     scan completed, or null if unknown.
 * @return {Function} return.handleScanClick Handler to trigger a new scan.
 * @return {Function} return.setScanSummary  Setter for manually updating
 *                                           the current scan summary.
 * @return {Function} return.setCompletedAt  Setter for manually updating
 *                                           the completion timestamp.
 */
export const useAccessibilityScan = ({
  onScanComplete,
  contentSnapshot,
  persistScan,
  getFreshPreviewUrl,
}: UseAccessibilityScanOptions) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<ScanMetrics | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  const handleScanClick = useCallback(async () => {
    if (isScanning) {
      return;
    }

    setIsScanning(true);
    setRunError(null);

    announceNotice('info', 'Running preview accessibility scan…', {
      isDismissible: false,
    });

    try {
      await savePostAndWait();

      const previewUrl = getFreshPreviewUrl();
      if (!previewUrl) {
        throw new Error('Could not generate a preview URL for this post.');
      }

	  console.info('Preview URL for accessibility scan:', previewUrl);

      const results = await runPreviewScan(previewUrl);
      setScanSummary(results);
      const completedDate = new Date();
      setCompletedAt(completedDate);

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
          `Accessibility scan complete. Found ${
            results.violations.length
          } violation${results.violations.length === 1 ? '' : 's'}.`,
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
  }, [
    contentSnapshot,
    onScanComplete,
    persistScan,
    isScanning,
    getFreshPreviewUrl,
  ]);

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
