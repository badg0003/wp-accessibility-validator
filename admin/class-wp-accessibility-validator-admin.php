<?php

/**
 * The admin-specific functionality of the plugin.
 *
 * @link       https://www.digiteam.ca/
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
class WP_Accessibility_Validator_Admin
{

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
	 * Cached WCAG options.
	 *
	 * @var array<string, string>
	 */
	private $wcag_options = array();

	/**
	 * Initialize the class and set its properties.
	 *
	 * @since    1.0.0
	 */
	public function __construct()
	{
		$this->plugin_name = 'wp-accessibility-validator';
		$this->version     = WPAV_VERSION;
		$this->wcag_options = $this->get_wcag_options();

		add_action('enqueue_block_editor_assets', array($this, 'enqueue_scripts'));
		add_action('admin_menu', array($this, 'register_settings_page'));
		add_action('admin_init', array($this, 'register_settings'));
		add_filter('block_editor_settings_all', array($this, 'inject_editor_styles'));
		add_filter('render_block', array($this, 'add_block_stable_id'), 10, 2);
	}

	/**
	 * Enqueue the JavaScript for the block editor.
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts()
	{
		$asset_file = include(plugin_dir_path(__FILE__) . '../build/index.asset.php');

		wp_enqueue_script(
			$this->plugin_name,
			plugin_dir_url(__FILE__) . '../build/index.js',
			$asset_file['dependencies'],
			$asset_file['version'],
			true
		);

		wp_localize_script(
			$this->plugin_name,
			'wpavSettings',
			array(
				'wcagTags'          => $this->get_selected_wcag_tags(),
				'availableWcagTags' => $this->wcag_options,
				'defaultWcagTags'   => array_keys($this->wcag_options),
			)
		);

		wp_enqueue_style(
			$this->plugin_name . '-editor',
			plugin_dir_url(__FILE__) . '../build/style-index.css',
			array('wp-edit-blocks'),
			$asset_file['version']
		);
	}

	/**
	 * Ensures the editor iframe receives the plugin styles.
	 *
	 * @param array $settings Block editor settings.
	 *
	 * @return array
	 */
	public function inject_editor_styles($settings)
	{
		$css_path = plugin_dir_path(__FILE__) . '../build/style-index.css';

		if (! file_exists($css_path)) {
			return $settings;
		}

		$css = file_get_contents($css_path);

		if (! $css) {
			return $settings;
		}

		if (! isset($settings['styles']) || ! is_array($settings['styles'])) {
			$settings['styles'] = array();
		}

		$settings['styles'][] = array(
			'css' => $css,
		);

		return $settings;
	}

	/**
	 * Register the plugin settings page.
	 */
	public function register_settings_page()
	{
		add_options_page(
			__('Accessibility Validator', 'wp-accessibility-validator'),
			__('Accessibility Validator', 'wp-accessibility-validator'),
			'manage_options',
			'wpav-settings',
			array($this, 'render_settings_page')
		);
	}

	/**
	 * Render the settings page markup.
	 */
	public function render_settings_page()
	{
		if (! current_user_can('manage_options')) {
			return;
		}
?>
		<div class="wrap">
			<h1><?php esc_html_e('Accessibility Validator', 'wp-accessibility-validator'); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields('wpav_settings');
				do_settings_sections('wpav_settings');
				submit_button();
				?>
			</form>
		</div>
<?php
	}

	/**
	 * Register settings, section, and fields.
	 */
	public function register_settings()
	{
		register_setting(
			'wpav_settings',
			'wpav_wcag_tags',
			array(
				'type'              => 'array',
				'sanitize_callback' => array($this, 'sanitize_wcag_tags'),
				'default'           => array_keys($this->wcag_options),
			)
		);

		add_settings_section(
			'wpav_settings_section',
			__('Scan Settings', 'wp-accessibility-validator'),
			function () {
				echo '<p>' . esc_html__('Choose which WCAG guidelines should be enforced when running scans.', 'wp-accessibility-validator') . '</p>';
			},
			'wpav_settings'
		);

		add_settings_field(
			'wpav_wcag_tags_field',
			__('WCAG guidelines', 'wp-accessibility-validator'),
			array($this, 'render_wcag_tags_field'),
			'wpav_settings',
			'wpav_settings_section'
		);
	}

	/**
	 * Output checkbox controls for each WCAG tag.
	 */
	public function render_wcag_tags_field()
	{
		$selected = $this->get_selected_wcag_tags();

		foreach ($this->wcag_options as $tag => $label) {
			printf(
				'<label style="display:block;margin-bottom:4px;"><input type="checkbox" name="wpav_wcag_tags[]" value="%1$s" %2$s/> %3$s</label>',
				esc_attr($tag),
				checked(in_array($tag, $selected, true), true, false),
				esc_html($label)
			);
		}
	}

	/**
	 * Sanitize WCAG tags before saving.
	 *
	 * @param mixed $value Raw option value.
	 *
	 * @return array<string>
	 */
	public function sanitize_wcag_tags($value)
	{
		$allowed = array_keys($this->wcag_options);

		if (! is_array($value)) {
			return $allowed;
		}

		$value = array_map(
			function ($tag) {
				return sanitize_key($tag);
			},
			$value
		);

		$clean = array_values(
			array_intersect(
				$allowed,
				$value
			)
		);

		return ! empty($clean) ? $clean : $allowed;
	}

	/**
	 * Returns stored WCAG tags or defaults.
	 *
	 * @return array<string>
	 */
	private function get_selected_wcag_tags()
	{
		$stored = get_option('wpav_wcag_tags');

		if (! is_array($stored) || empty($stored)) {
			return array_keys($this->wcag_options);
		}

		return array_values(
			array_intersect(
				array_keys($this->wcag_options),
				array_map('sanitize_key', $stored)
			)
		);
	}

	/**
	 * List of WCAG tags that axe supports.
	 *
	 * @return array<string, string>
	 */
	private function get_wcag_options()
	{
		return array(
			'wcag2a'   => __('WCAG 2.0 Level A', 'wp-accessibility-validator'),
			'wcag2aa'  => __('WCAG 2.0 Level AA', 'wp-accessibility-validator'),
			'wcag2aaa' => __('WCAG 2.0 Level AAA', 'wp-accessibility-validator'),
			'wcag21a'  => __('WCAG 2.1 Level A', 'wp-accessibility-validator'),
			'wcag21aa' => __('WCAG 2.1 Level AA', 'wp-accessibility-validator'),
			'wcag22aa' => __('WCAG 2.2 Level AA', 'wp-accessibility-validator'),
			'best-practice' => __('Best practices (non-WCAG)', 'wp-accessibility-validator'),
			'review-item'   => __('Manual review items', 'wp-accessibility-validator'),
		);
	}

	/**
	 * Adds stable block IDs to rendered block HTML for accessibility scanning.
	 *
	 * @param string $block_content The block content.
	 * @param array  $block         The block data.
	 *
	 * @return string Modified block content with stable IDs.
	 */
	public function add_block_stable_id($block_content, $block)
	{
		// Only modify content in preview mode
		if (! is_preview()) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor($block_content);

		if ($processor->next_tag()) {
			$generatedId = substr(md5(trim($block['innerHTML'])), 0, 12);
			$processor->set_attribute('data-wpav-block-id', $generatedId);
		}

		return $processor->get_updated_html();
	}
}
