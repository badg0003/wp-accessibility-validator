/**
 * Custom hook for managing the header button slot.
 */

import { useState, useEffect } from '@wordpress/element';
import { HEADER_SETTINGS_SELECTORS, PUBLISH_BUTTON_SELECTORS, CSS_CLASSES } from '../constants';

/**
 * Creates and manages a slot in the editor header for the scan button.
 *
 * @returns The HTMLElement to render the button into, or null if not yet available.
 */
export const useHeaderButtonSlot = (): HTMLElement | null => {
	const [slot, setSlot] = useState<HTMLElement | null>(null);

	useEffect(() => {
		if (typeof document === 'undefined') {
			return undefined;
		}

		let mount: HTMLDivElement | null = null;
		let frame: number | null = null;

		const ensureSlot = () => {
			const settingsArea = document.querySelector(
				HEADER_SETTINGS_SELECTORS.join(', ')
			) as HTMLElement | null;

			if (!settingsArea) {
				frame = window.requestAnimationFrame(ensureSlot);
				return;
			}

			mount = document.createElement('div');
			mount.className = CSS_CLASSES.headerButton;

			const publishButton = settingsArea.querySelector(
				PUBLISH_BUTTON_SELECTORS.join(', ')
			);
			settingsArea.insertBefore(mount, publishButton);
			setSlot(mount);
		};

		ensureSlot();

		return () => {
			if (frame) {
				window.cancelAnimationFrame(frame);
			}
			if (mount?.parentNode) {
				mount.parentNode.removeChild(mount);
			}
			setSlot(null);
		};
	}, []);

	return slot;
};
