# Quick Start Guide for Developers

## Understanding the Codebase

### Entry Point
Start here: `src/index.tsx` (only 38 lines!)

This file:
1. Imports all modules
2. Registers the violation store
3. Applies block editor filters
4. Registers the plugin with WordPress

### Key Directories

```
src/
├── components/     → React components (UI)
├── hooks/          → Custom React hooks (state & logic)
├── stores/         → Redux-style data stores
├── utils/          → Pure utility functions
├── types.ts        → TypeScript type definitions
└── constants.ts    → Configuration & constants
```

## Making Changes

### Adding a New Feature

**Example: Add a "Clear Results" button**

1. **Add the UI** in `components/AccessibilityCheckerSidebar.tsx`:
```typescript
<Button onClick={handleClearResults}>
  Clear Results
</Button>
```

2. **Add the handler** in the same file:
```typescript
const handleClearResults = useCallback(() => {
  setScanSummary(null);
  setCompletedAt(null);
  if (storageKey) {
    removeStoredScan(storageKey);
  }
}, [storageKey, setScanSummary, setCompletedAt]);
```

3. **That's it!** The utility function already exists in `utils/storage.ts`.

### Modifying Scan Behavior

Edit `src/utils/scanner.ts`:

```typescript
export const runClientSideScan = async (): Promise<ScanMetrics> => {
  // Your modifications here
};
```

### Adding New Constants

Edit `src/constants.ts`:

```typescript
export const MY_NEW_CONSTANT = 'value';
```

### Adding New Types

Edit `src/types.ts`:

```typescript
export interface MyNewType {
  field: string;
}
```

### Adding New Utilities

Create `src/utils/my-utility.ts`:

```typescript
/**
 * My utility function.
 */
export const myUtility = (input: string): string => {
  return input.toUpperCase();
};
```

Then export it in `src/utils/index.ts`:

```typescript
export * from './my-utility';
```

## Common Tasks

### Task: Change Scan Settings

File: `src/utils/scanner.ts`

```typescript
// Modify the RunOptions
const runOptions: RunOptions = {
  resultTypes: ['violations'],
  // Add more options here
};
```

### Task: Modify Violation Display

File: `src/components/AccessibilityCheckerSidebar.tsx`

Look for the violation rendering section around line 200.

### Task: Change Block Indicator Styling

File: `src/components/BlockViolationIndicator.tsx`

The CSS class `wpav-block--flagged` is added to blocks with violations.
Modify `src/style.scss` to change the appearance.

### Task: Add New Hook

Create `src/hooks/useMyHook.ts`:

```typescript
import { useState, useCallback } from '@wordpress/element';

export const useMyHook = () => {
  const [state, setState] = useState(null);
  
  const doSomething = useCallback(() => {
    // Logic here
  }, []);
  
  return { state, doSomething };
};
```

Export in `src/hooks/index.ts`:

```typescript
export * from './useMyHook';
```

## Data Flow

1. **User clicks scan button**
   → `AccessibilityCheckerSidebar` component

2. **handleScanClick is called**
   → `useAccessibilityScan` hook

3. **Scan executes**
   → `runClientSideScan` utility

4. **Results processed**
   → `useBlockViolations` hook

5. **Store updated**
   → `violation-store`

6. **UI updates**
   → Block indicators & toolbar badges appear

## Debugging

### Enable Verbose Logging

In `src/utils/scanner.ts`:

```typescript
console.log('Scanning block:', block.name);
```

### Check Store State

In browser console:

```javascript
wp.data.select('wpav/accessibility').getBlockViolations();
```

### Inspect Stored Data

In browser console:

```javascript
localStorage.getItem('wpav-scan-YOUR_POST_ID');
```

## Testing Your Changes

### Manual Testing

1. Start dev server: `npm run start`
2. Make your changes
3. Refresh WordPress editor
4. Run accessibility scan
5. Verify your changes work

### Type Checking

```bash
npx tsc --noEmit
```

### Build Production

```bash
npm run build
```

## File Size Guide

- **Small change**: Modify existing file
- **New utility**: Create in `utils/`
- **New component**: Create in `components/`
- **New state logic**: Create hook in `hooks/`

## Best Practices

1. ✅ **Add JSDoc comments** for new functions
2. ✅ **Add TypeScript types** for new data
3. ✅ **Use existing utilities** when possible
4. ✅ **Follow naming conventions**:
   - Components: `PascalCase`
   - Functions: `camelCase`
   - Constants: `UPPER_SNAKE_CASE`
   - Files: `kebab-case` or `PascalCase`
5. ✅ **Handle errors** with try-catch
6. ✅ **Clean up effects** in useEffect return
7. ✅ **Memoize expensive operations**
8. ✅ **Use existing constants** instead of magic values

## Common Pitfalls

❌ **Don't**: Mutate state directly
```typescript
// Bad
scanSummary.violations.push(newViolation);

// Good
setScanSummary({ ...scanSummary, violations: [...scanSummary.violations, newViolation] });
```

❌ **Don't**: Forget to export new utilities
```typescript
// Add to index.ts after creating utility
export * from './my-utility';
```

❌ **Don't**: Mix concerns
```typescript
// Don't put DOM manipulation in components
// Use utilities instead
```

✅ **Do**: Follow the existing patterns
```typescript
// Look at similar files for guidance
```

## Getting Help

1. **Check documentation**:
   - `ARCHITECTURE.md` - System design
   - `REFACTORING.md` - Implementation details
   - Inline JSDoc comments

2. **Search codebase**:
   ```bash
   grep -r "functionName" src/
   ```

3. **Check types**:
   ```bash
   # See all available types
   cat src/types.ts
   ```

## Quick Reference

| Need to... | Look in... |
|------------|-----------|
| Add UI element | `components/AccessibilityCheckerSidebar.tsx` |
| Change scan logic | `utils/scanner.ts` |
| Add new hook | `hooks/` |
| Add constant | `constants.ts` |
| Add type | `types.ts` |
| Change store | `stores/violation-store.ts` |
| Add utility | `utils/` |
| Change block indicator | `components/BlockViolationIndicator.tsx` |
| Change toolbar badge | `components/BlockToolbarIndicator.tsx` |

## Next Steps

1. Browse the code starting with `src/index.tsx`
2. Read the JSDoc comments
3. Check `ARCHITECTURE.md` for the big picture
4. Make a small change to get familiar
5. Run tests and verify everything works

Happy coding! 🚀
