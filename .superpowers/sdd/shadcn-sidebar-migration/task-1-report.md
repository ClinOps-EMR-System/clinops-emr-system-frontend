# Task 1 Report: Update nav-main.tsx — active route matching

## What was implemented

- Added `usePathname` import from `next/navigation`
- Added two helper functions: `routeMatches` (compares pathname to href with support for prefix matching) and `anyChildMatches` (recursively checks if any descendant's href matches the pathname)
- Updated `NavMain` to call `usePathname()` and pass the value down as a `pathname` prop
- Updated `NavMainItem` to accept `pathname` and use it for active detection:
  - Leaf items: `isParentActive` is true if `activeParent` state matches OR `routeMatches(pathname, item.href)` is true
  - Parent items (collapsible): `isParentActive` is true if `activeParent` matches OR `anyChildMatches` finds a matching descendant; the collapsible auto-expands via the existing `useEffect`
- Updated `NavMainSubItem` to accept `pathname` and use it:
  - Leaf sub items: `isActive` is true if `activeChild` state matches OR `routeMatches(pathname, item.href)` is true
  - Parent sub items (nested collapsibles): initial `isOpen` state is computed from `anyChildMatches(pathname, item.children)`

## Tested

- `npx tsc --noEmit` — passed with no errors

## Files changed

- `components/shadcn-space/blocks/sidebar-01/nav-main.tsx` — modified
- `.superpowers/sdd/shadcn-sidebar-migration/progress.md` — new (tracking file)
- `.superpowers/sdd/shadcn-sidebar-migration/task-1-brief.md` — new (tracking file)

## Self-review findings

- Active route matching is computed reactively during render (using `usePathname` directly in `isParentActive`/`isActive` expressions), so it works on initial page load and on browser back/forward without needing a separate `useEffect` to sync state. Click-based state (`activeParent`/`activeChild`) is preserved for the "click to mark active" behavior.
- The `routeMatches` function handles the root path `/` as a special case to avoid matching everything.
- `anyChildMatches` recurses into nested children, so deeply nested matches are detected.

## Issues or concerns

None.
