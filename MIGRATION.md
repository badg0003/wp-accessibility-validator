# Migration Guide

## For Developers Using This Plugin

### No Action Required! ✅

This refactoring is **100% backward compatible**. The plugin works exactly the same way from a user perspective.

### What Changed (Internally)

The codebase structure changed from:
```
src/
  └── index.tsx (1000+ lines)
```

To:
```
src/
  ├── index.tsx (38 lines)
  ├── types.ts
  ├── types.d.ts
  ├── constants.ts
  ├── components/
  ├── hooks/
  ├── stores/
  └── utils/
```

### If You Extended This Plugin

If you previously imported from the plugin, update your imports:

#### Before:
```typescript
// This won't work anymore - the functions are no longer exported
import { runClientSideScan } from './index';
```

#### After:
```typescript
// Import from the specific module
import { runClientSideScan } from './utils/scanner';
```

### Available Exports

#### From Components:
```typescript
import {
  AccessibilityCheckerSidebar,
  applyBlockViolationIndicator,
  applyBlockToolbarIndicator,
} from './components';
```

#### From Hooks:
```typescript
import {
  useAccessibilityScan,
  useBlockViolations,
  useHeaderButtonSlot,
  useStoredScan,
} from './hooks';
```

#### From Utils:
```typescript
import {
  // Storage
  getStorageKey,
  loadStoredScan,
  saveStoredScan,
  removeStoredScan,
  
  // WCAG
  getAvailableWcagLabels,
  resolveDefaultWcagTags,
  getConfiguredWcagTags,
  formatWcagLabelList,
  
  // DOM
  focusBlockById,
  openResultsPanel,
  highlightViolations,
  createScanElement,
  
  // Scanner
  runClientSideScan,
  
  // Impact
  getImpactMeta,
  
  // Notices
  announceNotice,
} from './utils';
```

#### From Stores:
```typescript
import { registerViolationStore } from './stores';
```

#### From Constants:
```typescript
import {
  STORAGE_PREFIX,
  SCAN_NOTICE_ID,
  PANEL_NAME,
  PANEL_STORE_ID,
  STORE_NAME,
  DEFAULT_WCAG_TAGS,
  IMPACT_META,
  HEADER_SETTINGS_SELECTORS,
  PUBLISH_BUTTON_SELECTORS,
  HIGHLIGHT_DURATION,
  CSS_CLASSES,
  DATA_ATTRIBUTES,
} from './constants';
```

#### From Types:
```typescript
import type {
  ViolationWithContext,
  ScanMetrics,
  StoredScan,
  BlockViolationState,
  ImpactMeta,
  WpavSettings,
  WPBlock,
  // ... etc
} from './types';
```

### WordPress Data Store

The store is still accessible the same way:

```typescript
import { select, dispatch } from '@wordpress/data';

// Get violations
const violations = select('wpav/accessibility').getBlockViolations();

// Update violations
dispatch('wpav/accessibility').setBlockViolations(totals, details);
```

### Build Process

No changes needed! The build process remains the same:

```bash
npm run build
# or
npm run start
```

### WordPress Filters

The filters are still registered and work identically:

- `editor.BlockListBlock` - Adds violation indicators
- `editor.BlockEdit` - Adds toolbar indicators

### Plugin Registration

The plugin is still registered as `'wp-accessibility-validator'`:

```typescript
// Still works
wp.plugins.getPlugin('wp-accessibility-validator');
```

## Testing Your Integration

If you extended this plugin, test these scenarios:

1. ✅ Plugin loads without errors
2. ✅ Scan button appears in editor
3. ✅ Scans run successfully
4. ✅ Results display correctly
5. ✅ Block indicators appear
6. ✅ Toolbar indicators appear
7. ✅ Stored scans persist
8. ✅ Your custom functionality still works

## Troubleshooting

### Issue: Build fails with module errors

**Solution**: Run `npm install` to ensure all dependencies are installed.

### Issue: TypeScript errors about missing types

**Solution**: The types are now in `src/types.ts`. Import from there:
```typescript
import type { ViolationWithContext } from './types';
```

### Issue: Constants not found

**Solution**: Import from the constants file:
```typescript
import { STORE_NAME } from './constants';
```

### Issue: Utilities not found

**Solution**: Import from the utils module:
```typescript
import { runClientSideScan } from './utils';
```

## Benefits of This Refactor

Even though no action is required, you'll benefit from:

1. **Better IDE Support** - Better autocomplete and type hints
2. **Easier Debugging** - Smaller, focused files
3. **Better Performance** - Optimized hooks and memoization
4. **Type Safety** - Comprehensive TypeScript types
5. **Better Documentation** - JSDoc comments everywhere
6. **Easier Extension** - Clear module boundaries

## Questions?

Refer to:
- `ARCHITECTURE.md` - System architecture
- `REFACTORING.md` - Detailed changes
- `SUMMARY.md` - Quick reference
- `CHECKLIST.md` - What was improved

Or check the inline JSDoc comments in each file.
