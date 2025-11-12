/**
 * Block toolbar indicator component.
 * Adds accessibility violation indicators to the block toolbar.
 */

/// <reference path="../types.d.ts" />

import { Fragment, createElement } from '@wordpress/element';
import { createHigherOrderComponent } from '@wordpress/compose';
import { addFilter } from '@wordpress/hooks';
import { useSelect } from '@wordpress/data';
import { BlockControls } from '@wordpress/block-editor';
import {
	ToolbarButton,
	ToolbarGroup,
	Dropdown,
	MenuGroup,
	MenuItem,
	Flex,
	FlexItem,
	__experimentalText as Text,
} from '@wordpress/components';
import { Icon, caution } from '@wordpress/icons';
import universalAccessIcon from '../icons/universal-access-icon';
import type { BlockEditProps, ViolationWithContext } from '../types';
import { STORE_NAME, CSS_CLASSES } from '../constants';
import { focusBlockById, openResultsPanel, highlightViolations } from '../utils';
import { getImpactMeta } from '../utils/impact';

/**
 * Higher-order component that adds a toolbar indicator to blocks with violations.
 */
const withBlockToolbarIndicator = createHigherOrderComponent(
	(BlockEdit: React.ComponentType<BlockEditProps>) => {
		return (props: BlockEditProps) => {
			const { violationCount, violationDetails } = useSelect(
				(selectFn) => {
					const store = selectFn(STORE_NAME) as any;
					if (!store?.getBlockViolations) {
						return { violationCount: 0, violationDetails: [] };
					}
					const counts = store.getBlockViolations() as Record<string, number>;
					const details = store.getBlockViolationDetails
						? store.getBlockViolationDetails()
						: {};
					return {
						violationCount: counts?.[props.clientId] || 0,
						violationDetails: details?.[props.clientId] || [],
					};
				},
				[props.clientId]
			);

			const hasViolations = violationCount > 0;
			const label =
				violationCount === 1
					? 'Accessibility checker: 1 issue detected'
					: `Accessibility checker: ${violationCount} issues detected`;

			const handleViewPanel = (targetViolationIds?: string[]) => {
				focusBlockById(props.clientId);
				openResultsPanel();

				const detailIds = (
					targetViolationIds ||
					violationDetails.map(
						(violation: ViolationWithContext) => violation.id
					)
				).filter(Boolean) as string[];

				if (detailIds.length > 0) {
					highlightViolations(detailIds);
				}
			};

			return (
				<Fragment>
					<BlockEdit {...props} />
					{hasViolations && (
						<BlockControls>
							<Dropdown
								position="bottom center"
								popoverProps={{ className: CSS_CLASSES.toolbarDropdown }}
								renderToggle={({ isOpen, onToggle }) => (
									<ToolbarGroup>
										<ToolbarButton
											icon={<Icon icon={universalAccessIcon} />}
											label={label}
											showTooltip
											isPressed={isOpen}
											onClick={() => {
												focusBlockById(props.clientId);
												onToggle();
											}}
										/>
									</ToolbarGroup>
								)}
								renderContent={({ onClose }) => (
									<div className={CSS_CLASSES.toolbarDropdownContent}>
										<MenuGroup
											label={
												violationCount === 1
													? '1 issue found in this block'
													: `${violationCount} issues found in this block`
											}
										>
											{violationDetails.map(
												(violation: ViolationWithContext, index: number) => {
													const impactMeta = getImpactMeta(violation.impact);
													return (
														<Flex
															align="top"
															key={`${violation.id}-${index}`}
														>
															<FlexItem>
																<Icon
																	icon={caution}
																	style={{ fill: impactMeta.color }}
																/>
															</FlexItem>
															<FlexItem>
																<Text isBlock>{violation.help}</Text>
																<Text isBlock variant="muted">
																	{violation.description}
																</Text>
																{violation.helpUrl && (
																	<Text isBlock>
																		<a
																			href={violation.helpUrl}
																			target="_blank"
																			rel="noreferrer noopener"
																		>
																			View guidance
																		</a>
																	</Text>
																)}
															</FlexItem>
														</Flex>
													);
												}
											)}
										</MenuGroup>
										<MenuGroup>
											<MenuItem
												onClick={() => {
													onClose();
													handleViewPanel();
												}}
											>
												Open accessibility panel
											</MenuItem>
										</MenuGroup>
									</div>
								)}
							/>
						</BlockControls>
					)}
				</Fragment>
			);
		};
	},
	'withBlockToolbarIndicator'
);

/**
 * Registers the block toolbar indicator filter.
 * This function ensures the filter is only applied once.
 */
export const applyBlockToolbarIndicator = (): void => {
	if (typeof window === 'undefined') {
		return;
	}

	// Prevent duplicate registration
	if (window.wpavToolbarFilterApplied) {
		return;
	}

	addFilter(
		'editor.BlockEdit',
		'wp-accessibility-validator/block-toolbar-indicator',
		withBlockToolbarIndicator
	);

	window.wpavToolbarFilterApplied = true;
};
