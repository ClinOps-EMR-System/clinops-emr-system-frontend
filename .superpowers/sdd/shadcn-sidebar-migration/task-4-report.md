# Task 4 Report: Update `(app)/layout.tsx` — SidebarProvider + AppSidebar

**Status:** ✅ Complete

**Changes made to `app/(app)/layout.tsx`:**
- Replaced `useState`, `useCallback`, `useEffect` imports with bare `import React from "react"`
- Swapped `Sidebar` import for `SidebarProvider` and `AppSidebar`
- Removed `sidebarCollapsed` state, `toggleSidebar` callback, and escape-key `useEffect`
- Replaced `flex h-screen` wrapper with `<SidebarProvider>` + `<AppSidebar>`
- Removed skip-to-content link (shadcn sidebar handles a11y)
- Kept loading state, unauthenticated guard, `<Topbar>`, and `<main>` as-is

**Verification:** `npx tsc --noEmit` passes with zero errors.

**Commit:** `2522369` — `refactor: integrate SidebarProvider and AppSidebar in app layout`

**Next:** Task 5 — remove old Sidebar component files.
