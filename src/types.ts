/**
 * Type definitions for the WP Accessibility Validator plugin.
 */

import type { Result as AxeResult } from 'axe-core';

/**
 * Custom violation type that includes WordPress block context.
 */
export interface ViolationWithContext extends AxeResult {
	blockName?: string;
	blockClientId?: string;
}

/**
 * Metrics collected during an accessibility scan.
 */
export interface ScanMetrics {
	totalBlocks: number;
	scannedBlocks: number;
	skippedBlocks: number;
	violations: ViolationWithContext[];
	errors: string[];
}

/**
 * Stored scan data including content hash for staleness detection.
 */
export interface StoredScan extends ScanMetrics {
	contentHash: string;
	completedAt: string;
}

/**
 * State shape for block violation tracking.
 */
export interface BlockViolationState {
	blockViolations: Record<string, number>;
	blockViolationDetails: Record<string, ViolationWithContext[]>;
}

/**
 * Actions for the violation store.
 */
export interface ViolationStoreActions {
	setBlockViolations: (
		blockViolations: Record<string, number>,
		blockViolationDetails: Record<string, ViolationWithContext[]>
	) => {
		type: string;
		blockViolations: Record<string, number>;
		blockViolationDetails: Record<string, ViolationWithContext[]>;
	};
}

/**
 * Selectors for the violation store.
 */
export interface ViolationStoreSelectors {
	getBlockViolations: (state: BlockViolationState) => Record<string, number>;
	hasBlockViolations: (state: BlockViolationState, clientId: string) => boolean;
	getBlockViolationDetails: (
		state: BlockViolationState
	) => Record<string, ViolationWithContext[]>;
	getBlockViolationsForBlock: (
		state: BlockViolationState,
		clientId: string
	) => ViolationWithContext[];
}

/**
 * Impact level metadata.
 */
export interface ImpactMeta {
	color: string;
	label: string;
}

/**
 * WordPress settings injected via wp_localize_script.
 */
export interface WpavSettings {
	availableWcagTags?: Record<string, string>;
	defaultWcagTags?: string[];
	wcagTags?: string[];
}

/**
 * WordPress block object.
 */
export interface WPBlock {
	name: string;
	clientId: string;
	attributes: Record<string, any>;
	innerBlocks: WPBlock[];
	isValid?: boolean;
}

/**
 * WordPress editor store interface.
 */
export interface WPEditorStore {
	getCurrentPostId: () => number | null;
	isEditorPanelOpened: (panelName: string) => boolean;
}

/**
 * WordPress block editor store interface.
 */
export interface WPBlockEditorStore {
	getBlocks: () => WPBlock[];
	selectBlock: (clientId: string) => void;
}

/**
 * WordPress edit-post store interface.
 */
export interface WPEditPostStore {
	openGeneralSidebar: (sidebarName: string) => void;
	toggleEditorPanelOpened: (panelName: string, forceOpen?: boolean) => void;
}

/**
 * WordPress notices store interface.
 */
export interface WPNoticesStore {
	createNotice: (
		type: 'info' | 'success' | 'warning' | 'error',
		message: string,
		options?: Record<string, unknown>
	) => void;
	removeNotice: (id: string) => void;
}

/**
 * Block edit component props.
 */
export interface BlockEditProps {
	clientId: string;
	name: string;
	attributes: Record<string, any>;
	setAttributes: (attributes: Record<string, any>) => void;
	isSelected: boolean;
	className?: string;
}

/**
 * Block list block component props.
 */
export interface BlockListBlockProps {
	clientId: string;
	className?: string;
	wrapperProps?: Record<string, any>;
	[key: string]: any;
}
