/**
 * WordPress notices utilities for displaying messages to users.
 */

import { dispatch } from '@wordpress/data';
import type { WPNoticesStore } from '../types';
import { SCAN_NOTICE_ID } from '../constants';

/**
 * Announces a notice to the user via the WordPress notices system.
 *
 * @param type - The type of notice (info, success, warning, error).
 * @param message - The message to display.
 * @param options - Additional options for the notice.
 */
export const announceNotice = (
	type: 'info' | 'success' | 'warning' | 'error',
	message: string,
	options: Record<string, unknown> = {}
): void => {
	const noticeStore = dispatch('core/notices') as Partial<WPNoticesStore>;

	if (!noticeStore?.createNotice) {
		return;
	}

	// Remove any existing scan notice
	if (noticeStore.removeNotice) {
		noticeStore.removeNotice(SCAN_NOTICE_ID);
	}

	noticeStore.createNotice(type, message, {
		id: SCAN_NOTICE_ID,
		...options,
	});
};
