/**
 * Redux-style store for tracking accessibility violations by block.
 */

/// <reference path="../types.d.ts" />

import { registerStore } from '@wordpress/data';
import type { BlockViolationState, ViolationStoreActions, ViolationStoreSelectors, ViolationWithContext } from '../types';
import { STORE_NAME } from '../constants';

/**
 * Default state for the violation store.
 */
const DEFAULT_STORE_STATE: BlockViolationState = {
	blockViolations: {},
	blockViolationDetails: {},
};

/**
 * Action types for the store.
 */
const ACTION_TYPES = {
	SET_BLOCK_VIOLATIONS: 'SET_BLOCK_VIOLATIONS',
} as const;

/**
 * Store actions.
 */
const actions: ViolationStoreActions = {
	setBlockViolations(
		blockViolations: Record<string, number>,
		blockViolationDetails: Record<string, ViolationWithContext[]>
	) {
		return {
			type: ACTION_TYPES.SET_BLOCK_VIOLATIONS,
			blockViolations,
			blockViolationDetails,
		};
	},
};

/**
 * Store reducer.
 */
const reducer = (
	state: BlockViolationState = DEFAULT_STORE_STATE,
	action: ReturnType<ViolationStoreActions['setBlockViolations']>
): BlockViolationState => {
	switch (action.type) {
		case ACTION_TYPES.SET_BLOCK_VIOLATIONS:
			return {
				...state,
				blockViolations: action.blockViolations || {},
				blockViolationDetails: action.blockViolationDetails || {},
			};
		default:
			return state;
	}
};

/**
 * Store selectors.
 */
const selectors: ViolationStoreSelectors = {
	getBlockViolations(state: BlockViolationState) {
		return state.blockViolations;
	},

	hasBlockViolations(state: BlockViolationState, clientId: string) {
		return Boolean(state.blockViolations?.[clientId]);
	},

	getBlockViolationDetails(state: BlockViolationState) {
		return state.blockViolationDetails;
	},

	getBlockViolationsForBlock(state: BlockViolationState, clientId: string) {
		return state.blockViolationDetails?.[clientId] || [];
	},
};

/**
 * Registers the violation tracking store with WordPress.
 * This function ensures the store is only registered once.
 */
export const registerViolationStore = (): void => {
	if (typeof window === 'undefined') {
		return;
	}

	// Prevent duplicate registration
	if (window.wpavStoreRegistered) {
		return;
	}

	registerStore(STORE_NAME, {
		reducer,
		actions,
		selectors,
	});

	window.wpavStoreRegistered = true;
};
