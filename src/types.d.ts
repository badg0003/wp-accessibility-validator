/**
 * Global type augmentations for the WP Accessibility Validator plugin.
 */

import type { WpavSettings } from './types';

declare global {
	interface Window {
		wpavSettings?: WpavSettings;
		wpavStoreRegistered?: boolean;
		wpavBlockFilterApplied?: boolean;
		wpavToolbarFilterApplied?: boolean;
	}
}

export {};
