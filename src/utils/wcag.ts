/**
 * WCAG tag utilities for accessibility scanning configuration.
 */

import { DEFAULT_WCAG_TAGS } from '../constants';

/**
 * Gets the available WCAG tag labels from WordPress settings.
 *
 * @returns A map of WCAG tag keys to human-readable labels.
 */
export const getAvailableWcagLabels = (): Record<string, string> => {
	if (typeof window === 'undefined') {
		return {};
	}

	return window.wpavSettings?.availableWcagTags ?? {};
};

/**
 * Resolves the default WCAG tags from settings or falls back to hardcoded defaults.
 *
 * @returns An array of WCAG tag strings.
 */
export const resolveDefaultWcagTags = (): string[] => {
	if (typeof window === 'undefined') {
		return DEFAULT_WCAG_TAGS;
	}

	const defaults = window.wpavSettings?.defaultWcagTags;

	if (Array.isArray(defaults) && defaults.length > 0) {
		return defaults;
	}

	const labels = getAvailableWcagLabels();
	const labelKeys = Object.keys(labels);

	return labelKeys.length > 0 ? labelKeys : DEFAULT_WCAG_TAGS;
};

/**
 * Gets the configured WCAG tags from WordPress settings.
 *
 * @returns An array of WCAG tag strings to use for scanning.
 */
export const getConfiguredWcagTags = (): string[] => {
	if (typeof window === 'undefined') {
		return DEFAULT_WCAG_TAGS;
	}

	const tags = window.wpavSettings?.wcagTags;

	if (Array.isArray(tags) && tags.length > 0) {
		return tags.filter((tag): tag is string => typeof tag === 'string');
	}

	return resolveDefaultWcagTags();
};

/**
 * Formats a list of WCAG tags into a human-readable string.
 *
 * @param tags - The WCAG tag keys.
 * @param labels - The map of tag keys to labels.
 * @returns A comma-separated string of labels.
 */
export const formatWcagLabelList = (
	tags: string[],
	labels: Record<string, string>
): string => {
	return tags.map((tag) => labels[tag] ?? tag).join(', ');
};
