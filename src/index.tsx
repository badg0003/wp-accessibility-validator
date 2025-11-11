/**
 * WP Accessibility Validator Plugin
 *
 * A WordPress plugin that provides accessibility scanning and validation
 * for the block editor using axe-core.
 */

import { registerPlugin } from '@wordpress/plugins';
import './style.scss';

// Initialize the violation store
import { registerViolationStore } from './stores';

// Apply block filters for visual indicators
import {
	applyBlockViolationIndicator,
	applyBlockToolbarIndicator,
} from './components';

// Main sidebar component
import { AccessibilityCheckerSidebar } from './components';

/**
 * Initialize the plugin.
 */
const initializePlugin = (): void => {
	// Register the violation tracking store
	registerViolationStore();

	// Apply block editor filters
	applyBlockViolationIndicator();
	applyBlockToolbarIndicator();

	// Register the main plugin component
	registerPlugin('wp-accessibility-validator', {
		render: AccessibilityCheckerSidebar,
	});
};

// Initialize when the module loads
initializePlugin();
