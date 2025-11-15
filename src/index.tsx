/**
 * WP Accessibility Validator Plugin
 *
 * A WordPress plugin that provides accessibility scanning and validation
 * for the block editor using axe-core.
 */

import { registerPlugin } from '@wordpress/plugins';
import { createElement, Fragment } from '@wordpress/element';

import './style.scss';

// Initialize the violation store
import { registerViolationStore } from './stores';

// Apply block filters for visual indicators
import {
  applyBlockViolationIndicator,
  applyBlockToolbarIndicator,
  AccessibilityCheckerSidebar,
  BlockStableIdProvider,
} from './components';

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
    render: () => (
      <Fragment>
        <BlockStableIdProvider />
        <AccessibilityCheckerSidebar />
      </Fragment>
    ),
  });
};

// Initialize when the module loads
initializePlugin();
