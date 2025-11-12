/**
 * Main accessibility checker sidebar component.
 */

import { Fragment, createElement, createPortal, useMemo, useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { serialize } from '@wordpress/blocks';
import {
	PluginDocumentSettingPanel,
	PluginPostStatusInfo,
	PluginPrePublishPanel,
} from '@wordpress/editor';
import {
	Button,
	Card,
	CardBody,
	Notice,
	PanelBody,
	Spinner,
} from '@wordpress/components';
import { Icon } from '@wordpress/icons';
import universalAccessIcon from '../icons/universal-access-icon';
import type { WPEditorStore, WPBlockEditorStore, WPBlock } from '../types';
import {
	useHeaderButtonSlot,
	useStoredScan,
	useAccessibilityScan,
	useBlockViolations,
} from '../hooks';
import {
	getAvailableWcagLabels,
	getConfiguredWcagTags,
	formatWcagLabelList,
	focusBlockById,
} from '../utils';
import {
	PANEL_NAME,
	CSS_CLASSES,
	DATA_ATTRIBUTES,
} from '../constants';

/**
 * Accessibility Checker Sidebar Component.
 * Provides UI for running accessibility scans and viewing results.
 */
export const AccessibilityCheckerSidebar = () => {
	// WCAG configuration
	const activeWcagTags = useMemo(() => getConfiguredWcagTags(), []);
	const wcagLabelMap = useMemo(() => getAvailableWcagLabels(), []);
	const wcagLabelText = useMemo(() => {
		const text = formatWcagLabelList(activeWcagTags, wcagLabelMap);
		return text || 'All available WCAG guidelines';
	}, [activeWcagTags, wcagLabelMap]);

	// Editor state
	const { postId, blocks } = useSelect((selectFn) => {
		const editorStore = selectFn('core/editor') as Partial<WPEditorStore>;
		const blockStore = selectFn('core/block-editor') as Partial<WPBlockEditorStore>;

		return {
			postId: editorStore?.getCurrentPostId?.() ?? null,
			blocks: blockStore?.getBlocks?.() ?? [],
		};
	}, []);

	// Content snapshot for staleness detection
	const contentSnapshot = useMemo(
		() => serialize(blocks as any),
		[blocks]
	);

	// Header button slot
	const headerSlot = useHeaderButtonSlot();

	// Scan mode state - now always preview
	const scanMode = 'preview';

	// Get preview URL if available
	const previewUrl = useSelect((selectFn) => {
		const editorStore = selectFn('core/editor') as any;
		return editorStore?.getEditedPostPreviewLink?.() || null;
	}, []);

	// Stored scan management
	const { storedScan, isScanStale, persistScan } = useStoredScan(
		postId,
		contentSnapshot
	);

	// Scan execution
	const {
		isScanning,
		scanSummary,
		runError,
		completedAt,
		handleScanClick,
		setScanSummary,
		setCompletedAt,
	} = useAccessibilityScan({
		contentSnapshot,
		persistScan,
		previewUrl,
	});

	// Load stored scan on mount
	useMemo(() => {
		if (storedScan && !scanSummary) {
			setScanSummary(storedScan);
			setCompletedAt(new Date(storedScan.completedAt));
		}
	}, [storedScan, scanSummary, setScanSummary, setCompletedAt]);

	// Block violation tracking
	const { violationsByBlock } = useBlockViolations(scanSummary);

	return (
		<Fragment>
			{/* Header button or post status button */}
			{headerSlot ? (
				createPortal(
					<Button
						className={CSS_CLASSES.headerButtonTrigger}
						icon={<Icon icon={universalAccessIcon} />}
						label="Run accessibility scan"
						aria-label="Run accessibility scan"
						onClick={handleScanClick}
						disabled={isScanning}
					/>,
					headerSlot
				)
			) : (
				<PluginPostStatusInfo className={CSS_CLASSES.postStatusAction}>
					<div className={CSS_CLASSES.postStatusControls}>
						<Button
							icon={<Icon icon={universalAccessIcon} />}
							label="Run accessibility scan"
							aria-label="Run accessibility scan"
							onClick={handleScanClick}
							disabled={isScanning}
						/>
						{isScanning && <Spinner />}
					</div>
				</PluginPostStatusInfo>
			)}

			{/* Document settings panel */}
			<PluginDocumentSettingPanel
				name={PANEL_NAME}
				title="Accessibility Checker"
				icon={<Icon icon={universalAccessIcon} />}
				className={CSS_CLASSES.panel}
			>
				{/* Scan status notices */}
				<div className={CSS_CLASSES.panelNotices} role="status" aria-live="polite">
					{isScanning && (
						<Notice status="info" isDismissible={false}>
							Running accessibility scan…
						</Notice>
					)}

					{runError && (
						<Notice status="error" isDismissible={false}>
							{runError}
						</Notice>
					)}
				</div>

				{/* WCAG filter info */}
				<div className={CSS_CLASSES.panelFilters}>
					<p>
						<strong>Active WCAG filters:</strong> {wcagLabelText}
					</p>
				</div>

				{/* Results */}
				<div className={CSS_CLASSES.panelContent}>
					{scanSummary ? (
						<>
							{/* Summary statistics */}
							<div className={CSS_CLASSES.summary}>
								<p>
									<strong>Total blocks:</strong> {scanSummary.totalBlocks}
								</p>
								<p>
									<strong>Scanned:</strong> {scanSummary.scannedBlocks}
								</p>
								<p>
									<strong>Skipped:</strong> {scanSummary.skippedBlocks}
								</p>
								<p>
									<strong>Violations:</strong> {scanSummary.violations.length}
								</p>
								{completedAt && (
									<p>
										<strong>Last run:</strong>{' '}
										{completedAt.toLocaleTimeString()}
									</p>
								)}
							</div>

							{/* Staleness warning */}
							{storedScan && isScanStale && (
								<Notice status="info" isDismissible={false}>
									The post has changed since the last scan. Run the checker
									again to refresh these results.
								</Notice>
							)}

							{/* Results or success message */}
							{scanSummary.violations.length === 0 ? (
								<Notice status="success" isDismissible={false}>
									No accessibility violations were detected in the scanned
									blocks.
								</Notice>
							) : (
								<>
									<Notice status="warning" isDismissible={false}>
										Found {scanSummary.violations.length} violation
										{scanSummary.violations.length === 1 ? '' : 's'} across{' '}
										{violationsByBlock.length} block
										{violationsByBlock.length === 1 ? '' : 's'}.
									</Notice>

									{/* Violation details by block */}
									{violationsByBlock.map(({ key, label, violations }) => (
										<PanelBody
											key={key}
											title={`${label} (${violations.length})`}
											initialOpen={false}
										>
											{violations.map((violation, index) => (
												<Card
													key={`${violation.id}-${index}`}
													{...{ [DATA_ATTRIBUTES.violationId]: violation.id }}
												>
													<CardBody>
														<p>
															<strong>{violation.help}</strong>
														</p>
														<p>{violation.description}</p>
														<p>
															<strong>Impact:</strong>{' '}
															{violation.impact || 'Not provided'}
														</p>
														<div>
															<strong>Affected elements:</strong>
															<ul>
																{violation.nodes.map((node, nodeIndex) => (
																	<li key={nodeIndex}>
																		<code>
																			{node.target?.join(' ') ||
																				node.html ||
																				'Unknown'}
																		</code>
																	</li>
																))}
															</ul>
														</div>
														<div className={CSS_CLASSES.cardActions}>
															<Button
																onClick={() =>
																	focusBlockById(violation.blockClientId)
																}
																variant="primary"
															>
																Go to block
															</Button>
															<Button
																href={violation.helpUrl}
																target="_blank"
																rel="noreferrer noopener"
																variant="secondary"
															>
																View fix guidance
															</Button>
														</div>
													</CardBody>
												</Card>
											))}
										</PanelBody>
									))}
								</>
							)}

							{/* Error list */}
							{scanSummary.errors.length > 0 && (
								<Notice status="info" isDismissible={false}>
									<strong>Some blocks were skipped:</strong>
									<ul>
										{scanSummary.errors.map((message, index) => (
											<li key={index}>{message}</li>
										))}
									</ul>
								</Notice>
							)}
						</>
					) : (
						<p>Run the accessibility checker to view results.</p>
					)}
				</div>
			</PluginDocumentSettingPanel>

			{/* Pre-publish panel */}
			<PluginPrePublishPanel
				title="Accessibility scan status"
				icon={<Icon icon={universalAccessIcon} />}
			>
				{scanSummary ? (
					<>
						{storedScan && isScanStale ? (
							<Notice status="warning" isDismissible={false}>
								The most recent accessibility scan is out of date. Run it again
								before publishing.
							</Notice>
						) : (
							<p>
								Latest scan completed{' '}
								{completedAt ? completedAt.toLocaleTimeString() : 'recently'}.
							</p>
						)}
						<p>
							Detected {scanSummary.violations.length} violation
							{scanSummary.violations.length === 1 ? '' : 's'}.
						</p>
					</>
				) : (
					<p>
						Run the accessibility checker to view results prior to publishing.
					</p>
				)}
			</PluginPrePublishPanel>
		</Fragment>
	);
};
