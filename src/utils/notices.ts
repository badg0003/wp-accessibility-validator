/**
 * Notice utilities for the Accessibility Validator plugin.
 *
 * Provides helper functions for announcing user-facing notices via the
 * WordPress `core/notices` data store. Used primarily during accessibility
 * scans to surface messages, warnings, success states, and errors in a
 * consistent and identifiable manner.
 *
 * @package WPAccessibilityValidator
 */

import { dispatch } from '@wordpress/data';
import type { WPNoticesStore } from '../types';
import { SCAN_NOTICE_ID } from '../constants';

/**
 * Announce a WordPress notice to the user.
 *
 * Wraps the `core/notices` data store to provide a unified mechanism for
 * showing plugin‑scoped notices. Any existing notice matching the
 * plugin‑specific `SCAN_NOTICE_ID` is removed before creating the new one,
 * ensuring only a single active scan notice is displayed at a time.
 *
 * @since 1.0.0
 *
 * @param {'info' | 'success' | 'warning' | 'error'} type
 *   The type of notice to display.
 * @param {string} message
 *   The message to present to the user.
 * @param {Record<string, unknown>} [options={}]
 *   Optional notice configuration options supported by WordPress core.
 *
 * @return {void}
 */
export const announceNotice = (
	type: 'info' | 'success' | 'warning' | 'error',
	message: string,
	options: Record<string, unknown> = {}
): void => {
	const noticeStore = dispatch('core/notices') as Pick<
		WPNoticesStore,
		'createNotice' | 'removeNotice'
	>;

	if (typeof noticeStore.createNotice !== 'function') {
		return;
	}

	// Ensure only one active scan‑related notice exists at a time.
	if (typeof noticeStore.removeNotice === 'function') {
		noticeStore.removeNotice(SCAN_NOTICE_ID);
	}

	noticeStore.createNotice(type, message, {
		id: SCAN_NOTICE_ID,
		...options,
	});
};
