/**
 * Custom hook for managing stored scan data.
 */

import { useState, useEffect, useMemo } from '@wordpress/element';
import type { StoredScan } from '../types';
import { getStorageKey, loadStoredScan, saveStoredScan } from '../utils';

/**
 * Hook for managing stored accessibility scan results.
 *
 * @param postId - The current post ID.
 * @param contentSnapshot - A hash or serialized representation of the current content.
 * @returns Stored scan data and utilities.
 */
export const useStoredScan = (postId: number | null, contentSnapshot: string) => {
	const storageKey = useMemo(() => getStorageKey(postId), [postId]);
	const [storedScan, setStoredScan] = useState<StoredScan | null>(null);

	// Load stored scan on mount and when storage key changes
	useEffect(() => {
		if (!storageKey) {
			setStoredScan(null);
			return;
		}

		const saved = loadStoredScan(storageKey);
		setStoredScan(saved);
	}, [storageKey]);

	// Check if the stored scan is stale
	const isScanStale = useMemo(() => {
		if (!storedScan) {
			return true;
		}
		return storedScan.contentHash !== contentSnapshot;
	}, [storedScan, contentSnapshot]);

	// Function to persist a new scan
	const persistScan = (scan: StoredScan) => {
		if (!storageKey) {
			return;
		}

		setStoredScan(scan);
		saveStoredScan(storageKey, scan);
	};

	return {
		storedScan,
		isScanStale,
		persistScan,
		storageKey,
	};
};
