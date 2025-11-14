/**
 * Storage utilities for persisting accessibility scan results.
 *
 * Provides helper functions for generating consistent storage keys,
 * loading and validating stored scan results, saving new results, and
 * removing outdated cached scan data from browser storage.
 *
 * @package WPAccessibilityValidator
 */

import type { StoredScan } from '../types';
import { STORAGE_PREFIX } from '../constants';

/**
 * Generates a storage key for a given post ID.
 *
 * @since 1.0.0
 *
 * @param {number|null} [postId] The post ID to generate a key for.
 * @return {?string} The storage key, or null if postId is invalid.
 */
export const getStorageKey = (postId?: number | null): string | null =>
	typeof postId === 'number' ? `${STORAGE_PREFIX}${postId}` : null;

/**
 * Loads a stored scan result from localStorage.
 *
 * Attempts to read and parse scan data from browser storage using the
 * provided key. If the data is missing, malformed, or does not match the
 * expected structure, null is returned and a warning is logged.
 *
 * @since 1.0.0
 *
 * @param {string} key The storage key to load from.
 * @return {?StoredScan} The stored scan data, or null if not found or invalid.
 */
export const loadStoredScan = (key: string): StoredScan | null => {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const raw = window.localStorage?.getItem?.(key);
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
			typeof parsed.completedAt !== 'string' ||
			Number.isNaN(Date.parse(parsed.completedAt))
		) {
			// eslint-disable-next-line no-console
			console.warn('Invalid stored scan data structure:', parsed);
			return null;
		}

		return parsed as StoredScan;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn('Unable to read stored accessibility scan results.', error);
		return null;
	}
};

/**
 * Saves scan results to localStorage.
 *
 * Serializes the provided scan data and writes it to browser storage
 * under the given key. Storage write failures are caught and logged.
 *
 * @since 1.0.0
 *
 * @param {string}    key  The storage key to save to.
 * @param {StoredScan} data The scan data to persist.
 */
export const saveStoredScan = (key: string, data: StoredScan): void => {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage?.setItem?.(key, JSON.stringify(data));
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn('Unable to persist accessibility scan results.', error);
	}
};

/**
 * Removes a stored scan from localStorage.
 *
 * Attempts to delete any cached scan data associated with the given key.
 * Storage errors are caught and logged.
 *
 * @since 1.0.0
 *
 * @param {string} key The storage key to remove.
 */
export const removeStoredScan = (key: string): void => {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		window.localStorage?.removeItem?.(key);
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn('Unable to remove stored scan.', error);
	}
};
