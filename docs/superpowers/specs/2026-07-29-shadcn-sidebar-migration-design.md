# Shadcn-Space Sidebar Migration

## Goal
Replace the custom `components/layout/Sidebar.tsx` with the shadcn-space `AppSidebar` component, preserving all role-based access control (RBAC) navigation filtering and real ClinOps routes.

## Files to Modify

### 1. `app/(app)/layout.tsx`
- Remove `sidebarCollapsed` state and `toggleSidebar` callback (SidebarProvider owns collapse state)
- Remove the outer `div.flex.h-screen` wrapper
- Import and wrap with `<SidebarProvider>`
- Replace `<Sidebar collapsed={...} onToggle={...} />` with `<AppSidebar />`
- Remove `onMenuToggle`/`sidebarCollapsed` props from `<Topbar>`
- The `Sidebar` peer element now handles layout gap via CSS

### 2. `components/layout/Sidebar.tsx` (DELETE)
- Entire file removed. Its RBAC logic transfers to `AppSidebar`

### 3. `components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx` (REWRITE)
- Import `usePathname` for active route detection
- Import `useAuth` and `ROLE_NAV_MAP` logic from existing Sidebar
- Define `NavItem[]` with ClinOps sections (Front Desk, Clinical, Services, Finance, Other, Admin)
- Filter nav items per user role using existing ROLE_NAV_MAP
- Remove shadcn-space demo nav data (Analytics, CRM Dashboard, Tables, Forms, Notes, Tickets, Blogs, Shadcn Forms, Form Layouts)
- Keep the promotional card and header logo structure from shadcn-space
- Add "SYSTEM ONLINE" indicator in SidebarFooter

### 4. `components/shadcn-space/blocks/sidebar-01/nav-main.tsx` (MODIFY)
- Add active route matching: compare `usePathname()` with `item.href` to auto-highlight active items
- Auto-expand collapsible parent when a child route matches current pathname
- Accept optional pathname prop or use usePathname internally

### 5. `components/layout/Topbar.tsx` (MODIFY)
- Remove `onMenuToggle` and `sidebarCollapsed` from `TopbarProps`
- Replace hamburger button (`Menu`/`X` icons) with `<SidebarTrigger>` component
- Keep all other functionality (search, breadcrumbs, user menu) unchanged

## Nav Section Structure

| Section | Items |
|---------|-------|
| Front Desk | Front Desk, Appointments, Patient Search |
| Clinical | Nurse Station, Triage Queue, Consultation Queue, Emergency Queue |
| Services | Pharmacy, Laboratory |
| Finance | Billing, Payments |
| Other | Referrals, Admissions, Queue |
| Admin | Admin (admin only) |

## RBAC Integration
- Same `ROLE_NAV_MAP` logic as current Sidebar
- `displayRole` derivation from user roles and department name unchanged
- `isAdmin` check grants access to all links
- Filtered links pass into the nav rendering

## Behavior
- **Desktop**: Sidebar collapses to icon-only mode via SidebarTrigger
- **Mobile**: Sidebar opens as Sheet overlay (already handled by shadcn sidebar)
- **Active state**: Nav items highlighted based on `usePathname` match
- **Collapsible groups**: parents auto-open when child is the active route
