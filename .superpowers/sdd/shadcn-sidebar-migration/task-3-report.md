# Task 3 Report — Update Topbar.tsx to use SidebarTrigger

## What was implemented

- Removed `Menu` from lucide-react imports (kept `X` since it's used by the mobile search close button)
- Added `import { SidebarTrigger } from "@/components/ui/sidebar"`
- Removed `TopbarProps` interface entirely
- Changed function signature from `Topbar({ onMenuToggle, sidebarCollapsed })` to `Topbar()`
- Replaced the manual hamburger button with `<SidebarTrigger className="lg:hidden ..." />`
- Updated `app/(app)/layout.tsx` caller to use `<Topbar />` without props

## Test results

- `npx tsc --noEmit` — passes with zero errors

## Files changed

| File | Change |
|------|--------|
| `components/layout/Topbar.tsx` | Imports, interface removed, function signature, hamburger → SidebarTrigger |
| `app/(app)/layout.tsx` | Removed `onMenuToggle` and `sidebarCollapsed` props from `<Topbar>` |

## Self-review findings

- The `X` icon was still used by the mobile search close button (line 238), so it was kept in the lucide import. Only `Menu` was fully removed.
- The `layout.tsx` caller still retains `sidebarCollapsed` state and `toggleSidebar` for the legacy Sidebar component — will be cleaned up in Task 4.
- Extra `cursor-pointer` was added to the SidebarTrigger className to match the existing button's implicit clickability.

## Concerns

None.
