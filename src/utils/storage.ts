/**
 * Storage utilities for persisting accessibility scan results.
 */

import type { StoredScan } from '../types';
import { STORAGE_PREFIX } from '../constants';

/**
 * Generates a storage key for a given post ID.
 *
 * @param postId - The post ID to generate a key for.
 * @returns The storage key, or null if postId is invalid.
 */
export const getStorageKey = (postId?: number | null): string | null =>
	typeof postId === 'number' ? `${STORAGE_PREFIX}${postId}` : null;

/**
 * Loads a stored scan result from localStorage.
 *
 * @param key - The storage key to load from.
 * @returns The stored scan data, or null if not found or invalid.
 */
export const loadStoredScan = (key: string): StoredScan | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw);

		// Validate the structure of the parsed data
		if (
			!parsed ||
			typeof parsed !== 'object' ||
			typeof parsed.totalBlocks !== 'number' ||
			typeof parsed.scannedBlocks !== 'number' ||
			typeof parsed.skippedBlocks !== 'number' ||
			!Array.isArray(parsed.violations) ||
			!Array.isArray(parsed.errors) ||
			typeof parsed.contentHash !== 'string' ||
			typeof parsed.completedAt !== 'string'
		) {
			console.warn('Invalid stored scan data structure:', parsed);
			return null;
		}

		return parsed as StoredScan;
	} catch (error) {
		console.warn('Unable to read stored accessibility scan results.', error);
		return null;
	}
};

/**
 * Saves scan results to localStorage.
 *
 * @param key - The storage key to save to.
 * @param data - The scan data to persist.
 */
export const saveStoredScan = (key: string, data: StoredScan): void => {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.setItem(key, JSON.stringify(data));
	} catch (error) {
		console.warn('Unable to persist accessibility scan results.', error);
	}
};

/**
 * Removes a stored scan from localStorage.
 *
 * @param key - The storage key to remove.
 */
export const removeStoredScan = (key: string): void => {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage.removeItem(key);
	} catch (error) {
		console.warn('Unable to remove stored scan.', error);
	}
};
