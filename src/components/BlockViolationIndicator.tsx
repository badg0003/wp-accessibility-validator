/**
 * Block violation indicator component.
 * Adds visual indicators to blocks that have accessibility violations.
 */

/// <reference path="../types.d.ts" />

import { createElement } from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { useSelect } from '@wordpress/data';
import type { BlockListBlockProps } from '../types';
import { STORE_NAME, CSS_CLASSES, DATA_ATTRIBUTES } from '../constants';

/**
 * Higher-order component that adds violation indicators to blocks.
 */
const withViolationIndicator = createHigherOrderComponent(
	(BlockListBlock: React.ComponentType<BlockListBlockProps>) => {
		return (props: BlockListBlockProps) => {
			const violationCount = useSelect(
				(selectFn) => {
					const store = selectFn(STORE_NAME) as any;
					if (!store?.getBlockViolations) {
						return 0;
					}
					const all = store.getBlockViolations() as Record<string, number>;
					return all?.[props.clientId] || 0;
				},
				[props.clientId]
			);

			const hasViolations = violationCount > 0;

			const className = [
				props.className,
				hasViolations ? CSS_CLASSES.blockFlagged : null,
			]
				.filter(Boolean)
				.join(' ');

			const wrapperProps = {
				...props.wrapperProps,
				[DATA_ATTRIBUTES.blockHasViolations]: hasViolations
					? 'true'
					: undefined,
				[DATA_ATTRIBUTES.violationLabel]: hasViolations
					? violationCount === 1
						? '1 issue'
						: `${violationCount} issues`
					: undefined,
			};

			return (
				<BlockListBlock
					{...props}
					className={className}
					wrapperProps={wrapperProps}
				/>
			);
		};
	},
	'withWpavViolationIndicator'
);

/**
 * Registers the block violation indicator filter.
 * This function ensures the filter is only applied once.
 */
export const applyBlockViolationIndicator = (): void => {
	if (typeof window === 'undefined') {
		return;
	}

	// Prevent duplicate registration
	if (window.wpavBlockFilterApplied) {
		return;
	}

	addFilter(
		'editor.BlockListBlock',
		'wp-accessibility-validator/block-indicator',
		withViolationIndicator
	);

	window.wpavBlockFilterApplied = true;
};
