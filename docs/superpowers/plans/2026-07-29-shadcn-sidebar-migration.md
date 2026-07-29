# Shadcn-Space Sidebar Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom `components/layout/Sidebar.tsx` with the shadcn-space `AppSidebar`, preserving all RBAC navigation filtering.

**Architecture:** The shadcn sidebar core (`SidebarProvider`, `Sidebar`, etc.) is already installed at `components/ui/sidebar.tsx`. The shadcn-space block at `components/shadcn-space/blocks/sidebar-01/` provides the `AppSidebar` shell. We rewrite `AppSidebar` with the ClinOps nav data and RBAC logic from the old `Sidebar.tsx`, update `Topbar` to use `SidebarTrigger`, and simplify `(app)/layout.tsx` to use `SidebarProvider`.

**Tech Stack:** Next.js, shadcn/ui sidebar, class-variance-authority, lucide-react, @base-ui/react

## Global Constraints

- Keep existing `ROLE_NAV_MAP` logic and `displayRole` derivation exactly as-is from old `Sidebar.tsx`
- All icons must be from `lucide-react` (already used throughout)
- Nav section labels (Front Desk, Clinical, Services, Finance, Other, Admin) are uppercase in the shadcn-space style
- The shadcn-space promotional card ("Grab Pro Now") is kept as-is

---

### Task 1: Update `nav-main.tsx` — active route matching

**Files:**
- Modify: `components/shadcn-space/blocks/sidebar-01/nav-main.tsx`

**Interfaces:**
- Consumes: `NavItem` type (already defined, unchanged)
- Produces: `<NavMain items={...} />` that highlights items matching current pathname

- [ ] **Step 1: Add `usePathname` import and hook**

```
Add `import { usePathname } from "next/navigation"` at top of file.
Inside `NavMain` component, add `const pathname = usePathname();`
Pass `pathname` to each `<NavMainItem>` as a prop.

Update NavMainItem signature:
```tsx
function NavMainItem({
  item,
  activeParent,
  setActiveParent,
  activeChild,
  setActiveChild,
  pathname,  // NEW
}: { ... pathname: string }) {
```

- [ ] **Step 2: Add pathname-based active detection in NavMainItem**

For items without children (line ~142):
```tsx
const isRouteActive = pathname === item.href || pathname.startsWith(item.href + "/");
```
Replace `isActive={isParentActive}` with `isActive={isParentActive || isRouteActive}`.

For items with children (line ~89): check if any child's href matches pathname and auto-expand:
```tsx
const hasActiveChild = item.children?.some(
  child => pathname === child.href || pathname.startsWith(child.href + "/")
);

// In useEffect that syncs open state:
React.useEffect(() => {
  if (isParentActive || hasActiveChild) {
    setIsOpen(true);
  }
}, [isParentActive, hasActiveChild]);
```

- [ ] **Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit` and confirm no errors in this file.

- [ ] **Step 4: Commit**

```bash
git add components/shadcn-space/blocks/sidebar-01/nav-main.tsx
git commit -m "feat: add active route matching to shadcn-space NavMain"
```

---

### Task 2: Rewrite `app-sidebar.tsx` — ClinOps RBAC nav data

**Files:**
- Modify: `components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx`

**Interfaces:**
- Consumes: `NavMain` with pathname-based active detection (Task 1), `useAuth` for user/roles, `usePathname` for active route
- Produces: `<AppSidebar />` component used in layout

- [ ] **Step 1: Replace imports and add RBAC dependencies**

Remove unused imports (`PieChart`, `ClipboardList`, `Notebook`, `NotepadText`, `Table`, `Languages`, `Ticket`, `AlignStartVertical`, `Card`, `CardContent`, `Button`).
Add imports:
```tsx
import { usePathname } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import {
  LayoutDashboard, ClipboardList, Calendar, Users, Stethoscope,
  Ambulance, Syringe, Pill, FlaskConical, DollarSign,
  CreditCard, ArrowRightLeft, DoorOpen, List, Shield,
} from "lucide-react";
```

- [ ] **Step 2: Define the RBAC nav data**

Replace `navData` with:
```tsx
const ROLE_NAV_MAP: Record<string, string[]> = {
  receptionist: ["receptionist", "appointments", "queue", "patients"],
  nurse: ["nurse-station", "triage-queue", "consultation-queue", "patients", "admissions", "emergency-queue"],
  doctor: ["patients", "lab", "referrals", "emergency-queue"],
  "clinical officer": ["patients", "lab", "referrals", "emergency-queue"],
  pharmacist: ["pharmacy"],
  "lab technician": ["lab"],
  "billing officer": ["billing", "patients"],
};

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Front Desk", isSection: true },
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Front Desk", icon: ClipboardList, href: "/receptionist" },
  { title: "Appointments", icon: Calendar, href: "/appointments" },
  { title: "Patient Search", icon: Users, href: "/patients" },

  { label: "Clinical", isSection: true },
  { title: "Nurse Station", icon: Stethoscope, href: "/nurse-station" },
  { title: "Triage Queue", icon: ClipboardList, href: "/triage-queue" },
  { title: "Consultation Queue", icon: Users, href: "/consultation-queue" },
  { title: "Emergency Queue", icon: Ambulance, href: "/emergency-queue" },

  { label: "Services", isSection: true },
  { title: "Pharmacy", icon: Pill, href: "/pharmacy" },
  { title: "Laboratory", icon: FlaskConical, href: "/lab" },

  { label: "Finance", isSection: true },
  { title: "Billing", icon: DollarSign, href: "/billing" },
  { title: "Payments", icon: CreditCard, href: "/payments" },

  { label: "Other", isSection: true },
  { title: "Queue", icon: List, href: "/queue" },
  { title: "Referrals", icon: ArrowRightLeft, href: "/referrals" },
  { title: "Admissions", icon: DoorOpen, href: "/admissions" },

  { label: "Admin", isSection: true },
  { title: "Admin", icon: Shield, href: "/admin" },
];
```

- [ ] **Step 3: Add RBAC filtering logic inside AppSidebar**

Inside `AppSidebar` component, before the return:
```tsx
const pathname = usePathname();
const { user } = useAuth();

const userRoles = (user?.roles || []).map((r) => r.toLowerCase());
const departmentName = user?.department?.name || "Clinical Operations";

const displayRole =
  userRoles.find((r) => ROLE_NAV_MAP[r]) ||
  (departmentName.toLowerCase().includes("registration") || departmentName.toLowerCase().includes("reception") ? "receptionist" : "") ||
  (departmentName.toLowerCase().includes("pharm") ? "pharmacist" : "") ||
  (departmentName.toLowerCase().includes("lab") ? "lab technician" : "") ||
  (departmentName.toLowerCase().includes("bill") || departmentName.toLowerCase().includes("finance") ? "billing officer" : "");

const isAdmin = userRoles.includes("admin");
const matchedRole = displayRole || userRoles.find((r) => ROLE_NAV_MAP[r]);
const allowedHrefs = isAdmin ? null : matchedRole ? ROLE_NAV_MAP[matchedRole] : null;

const filteredItems = allowedHrefs
  ? ALL_NAV_ITEMS.filter((item) => {
      if (item.isSection) return true;
      const segment = item.href?.replace("/", "") || "";
      return allowedHrefs.includes(segment);
    })
  : ALL_NAV_ITEMS;
```

- [ ] **Step 4: Update AppSidebar return to use filtered items + footer**

Replace the current layout's nav section with:
```tsx
<SidebarContent className="overflow-hidden">
  <ScrollArea className="h-[calc(100vh-100px)]">
    <div className="px-4">
      {!collapsed && filteredItems.some(i => i.isSection) && (
        <div className="mb-2 px-1">
          <span className="text-xs font-bold text-sidebar-foreground/70 uppercase tracking-widest">
            {departmentName}
          </span>
        </div>
      )}
      <NavMain items={filteredItems} />
    </div>
    {/* promotional card */}
    <div className="pt-5 px-4">
      <Card className="shadow-none ring-0 bg-secondary px-4 py-6">
        <CardContent className="p-0 flex flex-col gap-3 items-center">
          <img
            src="https://images.shadcnspace.com/assets/backgrounds/download-img.png"
            alt="sidebar-img"
            width={74}
            height={74}
            className="h-20 w-20"
          />
          <div className="flex flex-col gap-4 items-center">
            <div>
              <p className="text-base font-semibold text-card-foreground text-center">Grab Pro Now</p>
              <p className="text-sm font-regular text-muted-foreground text-center">Customize your admin</p>
            </div>
            <Button className="w-fit h-9 px-4 py-2 shadow-none cursor-pointer rounded-xl">Get Premium</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </ScrollArea>
</SidebarContent>
<SidebarFooter>
  <div className="flex items-center gap-1.5 p-2 text-[10px] text-sidebar-foreground/60 font-mono">
    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
    SYSTEM ONLINE
  </div>
</SidebarFooter>
```

Add imports for `SidebarFooter` from sidebar and bring back `Card`, `CardContent`, `Button`.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit` and confirm no errors.

- [ ] **Step 6: Commit**

```bash
git add components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx
git commit -m "feat: rewrite AppSidebar with ClinOps RBAC nav data"
```

---

### Task 3: Update `Topbar.tsx` — use SidebarTrigger

**Files:**
- Modify: `components/layout/Topbar.tsx`

**Interfaces:**
- Consumes: `SidebarTrigger` from `@/components/ui/sidebar`
- Produces: Same `Topbar` component with no props change needed (props removed entirely)

- [ ] **Step 1: Change TopbarProps and imports**

Remove `onMenuToggle` and `sidebarCollapsed` from `TopbarProps`:
```tsx
interface TopbarProps {}  // empty, or just remove TopbarProps
```
Change `export default function Topbar({ onMenuToggle, sidebarCollapsed }: TopbarProps)` to `export default function Topbar()`.

Remove `Menu` and `X` from lucide-react imports. Add `SidebarTrigger` import:
```tsx
import { Search, Bell, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
```

- [ ] **Step 2: Replace the mobile menu button with SidebarTrigger**

Replace lines ~157-163:
```tsx
{/* Mobile menu button */}
<SidebarTrigger className="lg:hidden text-gray-400 hover:text-white p-1.5 rounded-md hover:bg-gray-800/50 transition-colors cursor-pointer" />
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit` and confirm no errors.

- [ ] **Step 4: Commit**

```bash
git add components/layout/Topbar.tsx
git commit -m "refactor: replace manual toggle with SidebarTrigger in Topbar"
```

---

### Task 4: Update `(app)/layout.tsx` — use SidebarProvider + AppSidebar

**Files:**
- Modify: `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: `SidebarProvider` from `@/components/ui/sidebar`, `AppSidebar` from shadcn-space, updated `Topbar` (no props)

- [ ] **Step 1: Update imports**

Remove:
```tsx
import React, { useState, useCallback, useEffect } from "react";
import Sidebar from "../../components/layout/Sidebar";
```
Add:
```tsx
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/shadcn-space/blocks/sidebar-01/app-sidebar";
```
Keep `Topbar`, `useAuth`, `ToastProvider`.

- [ ] **Step 2: Remove sidebar state management**

Remove:
```tsx
const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
const toggleSidebar = useCallback(() => { ... }, []);
// Close sidebar on escape key useEffect
```

- [ ] **Step 3: Replace the return JSX**

Replace everything inside `<ToastProvider>`:
```tsx
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
```

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit` and confirm no errors.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/layout.tsx
git commit -m "refactor: integrate SidebarProvider and AppSidebar in app layout"
```

---

### Task 5: Remove old Sidebar and verify

**Files:**
- Delete: `components/layout/Sidebar.tsx`

- [ ] **Step 1: Delete the old Sidebar file**

```bash
git rm components/layout/Sidebar.tsx
```

- [ ] **Step 2: Full build check**

Run: `npx tsc --noEmit` and verify no errors about missing Sidebar module.

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove old custom Sidebar component"
```

---

### Task 6: Final verification

- [ ] **Step 1: Lint check**

Run the lint command (check package.json for lint script).

- [ ] **Step 2: Start dev server and verify**

Run `npm run dev` and navigate to confirm sidebar renders with correct nav items, collapse/expand works, Topbar toggle works, role-based filtering shows correct links.
