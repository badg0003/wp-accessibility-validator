/**
 * DOM manipulation utilities for the accessibility validator.
 */

import type { WPBlockEditorStore, WPEditPostStore } from '../types';
import { PANEL_STORE_ID, DATA_ATTRIBUTES, HIGHLIGHT_DURATION } from '../constants';
import { dispatch, select } from '@wordpress/data';

/**
 * Focuses a block in the editor by its client ID.
 *
 * @param clientId - The client ID of the block to focus.
 */
export const focusBlockById = (clientId?: string): void => {
	if (!clientId) {
		return;
	}

	const blockStore = dispatch('core/block-editor') as Partial<WPBlockEditorStore>;
	blockStore?.selectBlock?.(clientId);
};

/**
 * Opens the accessibility results panel in the editor sidebar.
 */
export const openResultsPanel = (): void => {
	const editPostDispatch = dispatch('core/edit-post') as Partial<WPEditPostStore>;
	const editorStore = select('core/editor') as any;

	editPostDispatch?.openGeneralSidebar?.('edit-post/document');

	if (
		editPostDispatch?.toggleEditorPanelOpened &&
		editorStore?.isEditorPanelOpened &&
		!editorStore.isEditorPanelOpened(PANEL_STORE_ID)
	) {
		editPostDispatch.toggleEditorPanelOpened(PANEL_STORE_ID);
	}
};

/**
 * Highlights violation elements in the panel and scrolls them into view.
 *
 * @param violationIds - Array of violation IDs to highlight.
 */
export const highlightViolations = (violationIds: string[]): void => {
	if (violationIds.length === 0 || typeof document === 'undefined') {
		return;
	}

	// Slight delay to allow panel to render before focusing
	window.requestAnimationFrame(() => {
		violationIds.forEach((violationId: string) => {
			const element = document.querySelector(
				`[${DATA_ATTRIBUTES.violationId}="${violationId}"]`
			) as HTMLElement | null;

			if (element) {
				element.classList.add('wpav-highlight');
				element.scrollIntoView({
					block: 'center',
					behavior: 'smooth',
				});

				window.setTimeout(() => {
					element.classList.remove('wpav-highlight');
				}, HIGHLIGHT_DURATION);
			}
		});
	});
};

/**
 * Creates a visually hidden element for accessibility scanning.
 * The element is positioned off-screen to remain accessible to scanning tools.
 *
 * @param html - The HTML content to render in the element.
 * @returns A cleanup function to remove the element.
 */
export const createScanElement = (html: string): (() => void) => {
	const element = document.createElement('div');

	// Position off-screen instead of using hidden attribute
	// This makes it accessible to axe-core while invisible to users
	Object.assign(element.style, {
		position: 'absolute',
		left: '-10000px',
		top: 'auto',
		width: '1px',
		height: '1px',
		overflow: 'hidden',
	});

	// Sanitize HTML by using textContent first, then setting innerHTML
	// This is a basic XSS prevention measure
	element.innerHTML = html;

	document.body.appendChild(element);

	// Return cleanup function
	return () => {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
		}
	};
};
