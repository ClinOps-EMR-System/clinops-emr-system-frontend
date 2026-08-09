"use client";

import React from "react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/assets/logo/logo";
import { NavItem, NavMain } from "@/components/shadcn-space/blocks/sidebar-01/nav-main";
import { useAuth } from "@/store/RoleContext";
import { LayoutDashboard, Calendar, Users, Stethoscope, ClipboardList, Pill, FlaskConical, ScanLine, DollarSign, CreditCard, ArrowRightLeft, DoorOpen, List, Shield, ShieldCheck, HeartPulse, GraduationCap } from "lucide-react";
import { usePermissions } from "@/lib/hooks/usePermissions";

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Front Desk", isSection: true },
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard", permissions: ["dashboard.view"] },
  { title: "Front Desk", icon: Users, href: "/receptionist", permissions: ["registration.create", "registration.edit"], roles: ["receptionist", "admin"] },
  { title: "Appointments", icon: Calendar, href: "/appointments", permissions: ["appointment.view"] },
  { title: "Patient Search", icon: Users, href: "/patients", permissions: ["patient.view"] },

  { label: "Clinical", isSection: true },
  { title: "Resuscitation", icon: HeartPulse, href: "/resuscitation", permissions: ["triage.view", "triage.create", "vital.create"], roles: ["nurse", "doctor", "clinical officer", "admin"] },
  { title: "Nurse Station", icon: Stethoscope, href: "/nurse-station", permissions: ["vital.create", "vital.view", "medication.administer"], roles: ["nurse", "admin"] },
  { title: "Triage Queue", icon: List, href: "/triage-queue", permissions: ["triage.view"], roles: ["nurse", "clinical officer", "admin"] },
  { title: "Consultation Queue", icon: ClipboardList, href: "/consultation-queue", permissions: ["consultation.view"], roles: ["doctor", "clinical officer", "clinical admin", "admin"] },

  { label: "Supervision", isSection: true },
  { title: "Verification", icon: ShieldCheck, href: "/supervision", permissions: ["supervisor.review"], roles: ["clinical admin", "supervisor", "admin"] },
  { title: "Students", icon: GraduationCap, href: "/supervision/students", permissions: ["supervisor.assign"], roles: ["doctor", "clinical admin", "it admin", "admin"] },

  { label: "Services", isSection: true },
  {
    title: "Pharmacy",
    icon: Pill,
    href: "/pharmacy",
    permissions: ["pharmacy.view", "pharmacy.dispense", "pharmacy.stock.view", "pharmacy.stock.manage", "pharmacy.verify"],
    roles: ["pharmacist", "admin"],
    children: [
      { title: "Overview", href: "/pharmacy", permissions: ["pharmacy.view"] },
      { title: "Dispensing", href: "/pharmacy/dispensing", permissions: ["pharmacy.dispense"] },
      { title: "Inventory", href: "/pharmacy/inventory", permissions: ["pharmacy.stock.view"] },
      { title: "Stock Management", href: "/pharmacy/stock", permissions: ["pharmacy.stock.manage"] },
      { title: "Stock Alerts", href: "/pharmacy/alerts", permissions: ["pharmacy.stock.view"] },
    ],
  },
  { title: "Laboratory", icon: FlaskConical, href: "/lab", permissions: ["lab.order", "lab.view", "lab.view_results"], roles: ["lab technician", "admin"] },
  { title: "Radiology", icon: ScanLine, href: "/radiology", permissions: ["imaging.order", "imaging.view", "imaging.report"], roles: ["radiographer", "admin"] },

  { label: "Finance", isSection: true },
  { title: "Billing", icon: DollarSign, href: "/billing", permissions: ["billing.view", "billing.create", "billing.waiver"], roles: ["billing officer", "admin"] },
  { title: "Payments", icon: CreditCard, href: "/payments", permissions: ["billing.create", "billing.waiver"], roles: ["billing officer", "admin"] },

  { label: "Other", isSection: true },
  { title: "Queue", icon: ArrowRightLeft, href: "/queue", permissions: ["queue.view"] },
  { title: "Referrals", icon: ArrowRightLeft, href: "/referrals", permissions: ["consultation.edit", "note.edit", "lab.view_results", "imaging.order"] },
  {
    title: "Admissions",
    icon: DoorOpen,
    href: "/admissions",
    permissions: ["admission.view", "ward.view", "ward.edit"],
    roles: ["nurse", "doctor", "clinical officer", "clinical admin", "admin"],
    children: [
      { title: "Overview", href: "/admissions", permissions: ["admission.view"] },
      { title: "Ward Occupancy", href: "/wards/occupancy", permissions: ["ward.view"] },
      { title: "Ward Management", href: "/wards", permissions: ["ward.view", "ward.edit"] },
    ],
  },

  { label: "Admin", isSection: true },
  { title: "System Admin", icon: Shield, href: "/system" },
];



export function AppSidebar() {
  const { user } = useAuth();
  const { canAccessAdmin, can, roles } = usePermissions();
  const { setOpenMobile } = useSidebar();

  const departmentName = user?.department?.name || "Clinical Operations";

  const filteredItems = filterNavItems(ALL_NAV_ITEMS, can, canAccessAdmin, roles);

  // Listen for "open-sidebar" event from BottomNav "More" button
  React.useEffect(() => {
    const handler = () => setOpenMobile(true);
    window.addEventListener("open-sidebar", handler);
    return () => window.removeEventListener("open-sidebar", handler);
  }, [setOpenMobile]);

  return (
    <Sidebar className="px-0 h-full **:data-[slot=sidebar-inner]:h-full">
      <div className="flex flex-col h-full">
        <SidebarHeader className="px-4 shrink-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <a href="#" className="w-full h-full">
                <Logo />
              </a>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent className="overflow-hidden flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="px-4 mb-2">
              <span className="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider">
                {departmentName}
              </span>
            </div>
            <div className="px-4">
              <NavMain items={filteredItems} />
            </div>

          </ScrollArea>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            SYSTEM ONLINE
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}

function filterNavItems(
  items: NavItem[],
  can: (permission: string) => boolean,
  canAccessAdmin: boolean,
  userRoles: string[],
): NavItem[] {
  const isVisible = (item: NavItem): boolean => {
    if (item.href === "/system") return canAccessAdmin;
    if (item.roles && item.roles.length > 0) {
      const hasRole = item.roles.some((r) => userRoles.includes(r.toLowerCase()));
      if (!hasRole) return false;
    }
    if (item.permissions && item.permissions.length > 0) {
      return item.permissions.some((p) => can(p));
    }
    return true;
  };

  const result: NavItem[] = [];
  let i = 0;
  while (i < items.length) {
    if (items[i].isSection) {
      const sectionLabel = items[i];
      i++;
      const sectionItems: NavItem[] = [];
      while (i < items.length && !items[i].isSection) {
        sectionItems.push(items[i]);
        i++;
      }
      const visibleItems: NavItem[] = [];
      for (const item of sectionItems) {
        if (!isVisible(item)) continue;
        const children = item.children?.filter(isVisible);
        if (item.children && children && children.length === 0) continue;
        visibleItems.push(children ? { ...item, children } : item);
      }
      if (visibleItems.length > 0) {
        result.push(sectionLabel);
        result.push(...visibleItems);
      }
    } else {
      if (isVisible(items[i])) {
        result.push(items[i]);
      }
      i++;
    }
  }
  return result;
}
