<?php
/**
 * The admin-specific functionality of the plugin.
 *
 * @link       YOUR_WEBSITE_URL
 * @since      1.0.0
 *
 * @package    Wp_Accessibility_Validator
 * @subpackage Wp_Accessibility_Validator/admin
 */

/**
 * The admin-specific functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the admin-specific stylesheet and JavaScript.
 */
class WP_Accessibility_Validator_Admin {

	/**
	 * The ID of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $plugin_name    The ID of this plugin.
	 */
	private $plugin_name;

	/**
	 * The version of this plugin.
	 *
	 * @since    1.0.0
	 * @access   private
	 * @var      string    $version    The current version of this plugin.
	 */
	private $version;

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 */
	public function __construct() {
		$this->plugin_name = 'wp-accessibility-validator';
		$this->version     = WPAV_VERSION;

		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_scripts' ) );
	}

	/**
	 * Enqueue the JavaScript for the block editor.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts() {
		$asset_file = include( plugin_dir_path( __FILE__ ) . '../build/index.asset.php' );

		wp_enqueue_script(
			$this->plugin_name,
			plugin_dir_url( __FILE__ ) . '../build/index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);
	}
}