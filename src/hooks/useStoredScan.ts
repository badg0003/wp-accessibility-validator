/**
 * Stored scan hook.
 *
 * Provides a React hook for loading, tracking, and persisting stored
 * accessibility scan results keyed by post. Stored scans are cached in
 * browser storage and marked as stale when the current content no longer
 * matches the stored snapshot.
 *
 * @package WPAccessibilityValidator
 */

import { useState, useEffect, useMemo, useCallback } from '@wordpress/element';
import type { StoredScan } from '../types';
import { getStorageKey, loadStoredScan, saveStoredScan } from '../utils';

/**
 * Result shape for the stored scan hook.
 *
 * @typedef {Object} UseStoredScanResult
 * @property {?StoredScan} storedScan   The most recently stored scan for the post,
 *                                      or null if none is available.
 * @property {boolean}     isScanStale  Whether the stored scan no longer matches
 *                                      the current content snapshot.
 * @property {Function}    persistScan  Function for persisting a new scan result.
 * @property {?string}     storageKey   Storage key used for this post, or null
 *                                      when a key cannot be generated.
 */
interface UseStoredScanResult {
  storedScan: StoredScan | null;
  isScanStale: boolean;
  persistScan: (scan: StoredScan) => void;
  storageKey: string | null;
}

/**
 * Hook for managing stored accessibility scan results.
 *
 * Loads any stored scan data for the given post ID, determines whether it is
 * stale relative to the current content snapshot, and provides a helper for
 * persisting new scan results. Data is keyed using a storage key derived
 * from the post ID.
 *
 * @since 1.0.0
 *
 * @param {number|null} postId          The current post ID, or null if none.
 * @param {string}      contentSnapshot A hash or serialized representation of
 *                                      the current content.
 * @return {UseStoredScanResult} Stored scan data and utilities.
 */
export const useStoredScan = (
  postId: number | null,
  contentSnapshot: string
): UseStoredScanResult => {
	const storageKey = useMemo(() => getStorageKey(postId), [postId]);
	const [storedScan, setStoredScan] = useState<StoredScan | null>(null);

	// Load stored scan on mount and when storage key changes
	useEffect(() => {
		if (!storageKey) {
			setStoredScan(null);
			return;
		}

		try {
			const saved = loadStoredScan(storageKey);
			setStoredScan(saved);
		} catch (error) {
			// eslint-disable-next-line no-console
			console.warn(
				'WPAccessibilityValidator: failed to load stored scan from storage key',
				storageKey,
				error
			);
			setStoredScan(null);
		}
	}, [storageKey]);

	// Check if the stored scan is stale
	const isScanStale = useMemo(() => {
		if (!storedScan) {
			// No stored scan yet: nothing to mark as stale.
			return false;
		}
		return storedScan.contentHash !== contentSnapshot;
	}, [storedScan, contentSnapshot]);

	// Function to persist a new scan
	const persistScan = useCallback(
		(scan: StoredScan) => {
			if (!storageKey) {
				return;
			}

			setStoredScan(scan);
			saveStoredScan(storageKey, scan);
		},
		[storageKey]
	);

	return {
		storedScan,
		isScanStale,
		persistScan,
		storageKey,
	};
};
