### Task 4: Update `(app)/layout.tsx` — use SidebarProvider + AppSidebar

**Files:**
- Modify: `app/(app)/layout.tsx`

**Current file content:**

```tsx
"use client";

import React, { useState, useCallback, useEffect } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../store/RoleContext";
import { ToastProvider } from "../../components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sidebarCollapsed]);

  if (isLoading) { ... unchanged ... }
  if (!isAuthenticated) { return null; }

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-clinical-bg">
        <a href="#main-content" ...>Skip to main content</a>
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main id="main-content" ...>{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
```

**Changes needed:**

1. Replace imports:
   - Remove: `Sidebar` from `../../components/layout/Sidebar`
   - Remove: `useState`, `useCallback`, `useEffect` from React (keep just `import React from "react"`)
   - Add: `import { SidebarProvider } from "@/components/ui/sidebar";`
   - Add: `import { AppSidebar } from "@/components/shadcn-space/blocks/sidebar-01/app-sidebar";`

2. Remove inside the component:
   - `const [sidebarCollapsed, setSidebarCollapsed] = useState(true);`
   - `const toggleSidebar = useCallback(...)`
   - The escape-key `useEffect` block

3. Replace the return JSX:
   - Remove the outer `div.flex.h-screen` and its skip-to-content link (shadcn sidebar handles its own layout)
   - Remove `<Sidebar collapsed={...} onToggle={...} />`
   - Wrap with `<SidebarProvider>`
   - Add `<AppSidebar />`
   - Keep `<Topbar />` and `<main>`

Final return should look like:
```tsx
return (
    <ToastProvider>
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#fcf9f8] text-[#1b1c1c] focus:outline-none"
          >
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ToastProvider>
  );
```

4. Run `npx tsc --noEmit` to verify
5. Commit with: `"refactor: integrate SidebarProvider and AppSidebar in app layout"`
