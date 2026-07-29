### Task 2: Rewrite `app-sidebar.tsx` — ClinOps RBAC nav data

**Files:**
- Modify: `components/shadcn-space/blocks/sidebar-01/app-sidebar.tsx`

**Interfaces:**
- Consumes: `NavMain` with `pathname`-based active detection (Task 1), `useAuth` for user/roles, `usePathname` for active route, `SidebarFooter` from `@/components/ui/sidebar`
- Produces: `<AppSidebar />` component (no props, used in layout)

**Changes needed:**

1. **Imports:** Remove unused imports (`PieChart`, `ClipboardList`, `Notebook`, `NotepadText`, `Table`, `Languages`, `Ticket`, `AlignStartVertical`). Keep `Card`, `CardContent`, `Button`, `ScrollArea`, `Logo`, `NavMain`, `NavItem`, `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarMenu`, `SidebarMenuItem`. Add:
   - `import { usePathname } from "next/navigation";`
   - `import { useAuth } from "@/store/RoleContext";`
   - `import { SidebarFooter } from "@/components/ui/sidebar";`
   - New lucide-react icons: `LayoutDashboard, Calendar, Users, Stethoscope, ClipboardList, Ambulance, Pill, FlaskConical, DollarSign, CreditCard, ArrowRightLeft, DoorOpen, List, Shield`

2. **Replace `navData`** with the ClinOps nav structure (ALL_NAV_ITEMS):
   - Front Desk section: Dashboard, Front Desk, Appointments, Patient Search
   - Clinical section: Nurse Station, Triage Queue, Consultation Queue, Emergency Queue
   - Services section: Pharmacy, Laboratory
   - Finance section: Billing, Payments
   - Other section: Queue, Referrals, Admissions
   - Admin section: Admin

3. **Add RBAC filtering** inside `AppSidebar` function:
   - Define `ROLE_NAV_MAP` (same as in old `components/layout/Sidebar.tsx`)
   - Get `user` from `useAuth()`
   - Derive `displayRole`, `matchedRole`, `allowedHrefs` same as old Sidebar
   - Filter `ALL_NAV_ITEMS` based on role

4. **Update the return JSX:**
   - Add department name label (like old sidebar)
   - Pass `filteredItems` to `<NavMain>`
   - Add `<SidebarFooter>` with "SYSTEM ONLINE" indicator at the bottom
   - Keep the header with Logo
   - Keep the promotional card

5. **Run `npx tsc --noEmit`** to verify

6. **Commit** with message: `"feat: rewrite AppSidebar with ClinOps RBAC nav data"`
