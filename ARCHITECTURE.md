# Architecture Overview

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                       index.tsx                              │
│                    (Entry Point)                             │
└────────────┬────────────────────────────────┬────────────────┘
             │                                │
             ▼                                ▼
    ┌────────────────┐              ┌──────────────────┐
    │    Stores      │              │   Components     │
    │ ─────────────  │              │ ──────────────── │
    │ violation-     │◄─────────────┤ Accessibility    │
    │   store.ts     │              │   Checker        │
    └────────────────┘              │   Sidebar        │
                                    │                  │
                                    │ Block Violation  │
                                    │   Indicator      │
                                    │                  │
                                    │ Block Toolbar    │
                                    │   Indicator      │
                                    └────────┬─────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                        ┌──────────┐  ┌──────────┐  ┌──────────┐
                        │  Hooks   │  │  Utils   │  │Constants │
                        │ ──────── │  │ ──────── │  │ ──────── │
                        │ Header   │  │ DOM      │  │ STORE_   │
                        │   Slot   │  │ Scanner  │  │   NAME   │
                        │          │  │ Storage  │  │ CSS_     │
                        │ Stored   │  │ WCAG     │  │  CLASSES │
                        │   Scan   │  │ Impact   │  │ etc.     │
                        │          │  │ Notices  │  └──────────┘
                        │ Scan     │  └──────────┘
                        │          │       ▲
                        │ Block    │       │
                        │ Violations│      │
                        └──────────┘       │
                              │            │
                              └────────────┘
                                   ▲
                                   │
                            ┌──────────────┐
                            │    Types     │
                            │ ──────────── │
                            │ Violation    │
                            │   WithContext│
                            │ ScanMetrics  │
                            │ StoredScan   │
                            │ etc.         │
                            └──────────────┘
```

## Data Flow

```
User Action (Click Scan Button)
         │
         ▼
┌────────────────────────┐
│ AccessibilityChecker   │
│      Sidebar           │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│ useAccessibilityScan   │ ◄──────── handleScanClick
│      (Hook)            │
└───────────┬────────────┘
            │
            ▼
┌────────────────────────┐
│  runClientSideScan     │ ◄──────── Scanner utility
│     (Utils)            │
└───────────┬────────────┘
            │
            ├──► Get blocks from WordPress
            │
            ├──► For each block:
            │    ├─► Serialize to HTML
            │    ├─► Create off-screen DOM element
            │    ├─► Run axe-core scan
            │    └─► Cleanup element
            │
            ▼
┌────────────────────────┐
│   Scan Results         │
│   (ViolationWithContext)│
└───────────┬────────────┘
            │
            ├──► Save to localStorage (useStoredScan)
            │
            ├──► Update component state
            │
            ├──► Group by block (useBlockViolations)
            │
            └──► Update violation store
                 │
                 ▼
┌────────────────────────────────────────┐
│  violation-store (Redux-style)         │
│  ────────────────────────────────      │
│  State: {                              │
│    blockViolations: { [id]: count }   │
│    blockViolationDetails: { [id]: [] }│
│  }                                     │
└──────────────┬─────────────────────────┘
               │
               ├──► BlockViolationIndicator
               │    (Adds visual markers)
               │
               └──► BlockToolbarIndicator
                    (Adds toolbar badges)
```

## Component Hierarchy

```
PluginSidebar (WordPress)
    │
    ├─► AccessibilityCheckerSidebar (Main Component)
    │   │
    │   ├─► Header Button (Portal)
    │   │   └─► useHeaderButtonSlot
    │   │
    │   ├─► PluginDocumentSettingPanel
    │   │   │
    │   │   ├─► Scan Button
    │   │   │
    │   │   ├─► Scan Status (ARIA live region)
    │   │   │
    │   │   ├─► WCAG Filter Info
    │   │   │
    │   │   └─► Results
    │   │       │
    │   │       ├─► Summary Stats
    │   │       │
    │   │       ├─► Staleness Warning
    │   │       │
    │   │       └─► Violation Groups
    │   │           │
    │   │           └─► PanelBody (per block)
    │   │               └─► Card (per violation)
    │   │                   └─► Action Buttons
    │   │
    │   └─► PluginPrePublishPanel
    │       └─► Scan Status Summary
    │
    ├─► BlockViolationIndicator (Filter on all blocks)
    │   └─► Adds CSS classes and data attributes
    │
    └─► BlockToolbarIndicator (Filter on all blocks)
        └─► Adds toolbar dropdown with violations
```

## Hook Dependencies

```
useAccessibilityScan
    ├─► Uses: runClientSideScan (util)
    ├─► Uses: announceNotice (util)
    ├─► Uses: openResultsPanel (util)
    └─► Provides: handleScanClick, isScanning, scanSummary

useStoredScan
    ├─► Uses: getStorageKey (util)
    ├─► Uses: loadStoredScan (util)
    ├─► Uses: saveStoredScan (util)
    └─► Provides: storedScan, isScanStale, persistScan

useBlockViolations
    ├─► Uses: violation-store (dispatch)
    └─► Provides: violationsByBlock, blockViolationTotals

useHeaderButtonSlot
    ├─► Uses: DOM APIs
    └─► Provides: headerSlot (HTMLElement)
```

## Utility Dependencies

```
scanner.ts
    ├─► Depends on: axe-core
    ├─► Depends on: @wordpress/blocks (serialize)
    ├─► Depends on: @wordpress/data (select)
    ├─► Uses: getConfiguredWcagTags
    └─► Uses: createScanElement (dom.ts)

dom.ts
    ├─► Depends on: @wordpress/data (dispatch/select)
    └─► Uses: PANEL_STORE_ID, DATA_ATTRIBUTES

wcag.ts
    ├─► Depends on: window.wpavSettings
    └─► Uses: DEFAULT_WCAG_TAGS

storage.ts
    ├─► Depends on: localStorage
    └─► Uses: STORAGE_PREFIX

notices.ts
    ├─► Depends on: @wordpress/data (dispatch)
    └─► Uses: SCAN_NOTICE_ID

impact.ts
    └─► Uses: IMPACT_META
```

## Type System

```
types.ts (Core Types)
    ├─► ViolationWithContext (extends axe.Result)
    ├─► ScanMetrics
    ├─► StoredScan (extends ScanMetrics)
    ├─► BlockViolationState
    ├─► ImpactMeta
    ├─► WpavSettings
    ├─► WPBlock
    ├─► WPEditorStore
    ├─► WPBlockEditorStore
    ├─► WPEditPostStore
    ├─► WPNoticesStore
    ├─► BlockEditProps
    └─► BlockListBlockProps

types.d.ts (Global Augmentation)
    └─► extends Window interface
        ├─► wpavSettings
        ├─► wpavStoreRegistered
        ├─► wpavBlockFilterApplied
        └─► wpavToolbarFilterApplied
```
