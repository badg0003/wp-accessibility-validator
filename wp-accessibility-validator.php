<?php

/**
 * Plugin Name:       WP Accessibility Validator
 * Description:       Adds an on-demand accessibility checker to the block editor to validate content against WCAG standards.
 * Version:           2.1.0
 * Author:            Mike Badgley
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       wp-accessibility-validator
 */

if (! defined('WPINC')) {
	die;
}

if (! defined('WPAV_VERSION')) {
	define('WPAV_VERSION', '2.1.0');
}

/**
 * The core plugin class.
 */
if (! class_exists('WP_Accessibility_Validator')) {
	final class WP_Accessibility_Validator
	{

	/**
	 * The single instance of the class.
	 */
	protected static $_instance = null;

	/**
	 * Main WP_Accessibility_Validator Instance.
	 */
	public static function instance()
	{
		if (is_null(self::$_instance)) {
			self::$_instance = new self();
		}
		return self::$_instance;
	}

	/**
	 * Constructor.
	 */
	public function __construct()
	{
		$this->includes();
		$this->init_hooks();
	}

	/**
	 * Include required core files.
	 */
	private function includes()
	{
		require_once plugin_dir_path(__FILE__) . 'admin/class-wp-accessibility-validator-admin.php';
	}

	/**
	 * Hook into actions and filters.
	 */
	private function init_hooks()
	{
		new WP_Accessibility_Validator_Admin();
	}
	}
}

/**
 * Main instance of plugin.
 */
if (! function_exists('wp_accessibility_validator')) {
	function wp_accessibility_validator()
	{
		return WP_Accessibility_Validator::instance();
	}
}

// Global for backwards compatibility.
if (! isset($GLOBALS['wp_accessibility_validator'])) {
	$GLOBALS['wp_accessibility_validator'] = wp_accessibility_validator();
}
