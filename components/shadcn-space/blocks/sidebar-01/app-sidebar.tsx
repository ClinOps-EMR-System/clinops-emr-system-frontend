"use client";

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import Logo from "@/assets/logo/logo";
import { NavItem, NavMain } from "@/components/shadcn-space/blocks/sidebar-01/nav-main";
import { useAuth } from "@/store/RoleContext";
import { LayoutDashboard, Calendar, Users, Stethoscope, ClipboardList, Pill, FlaskConical, ScanLine, DollarSign, CreditCard, ArrowRightLeft, DoorOpen, List, Shield, ShieldCheck, HeartPulse } from "lucide-react";
import { usePermissions } from "@/lib/hooks/usePermissions";

const ROLE_NAV_MAP: Record<string, string[]> = {
  receptionist: ["receptionist", "appointments", "queue", "patients"],
  nurse: ["nurse-station", "triage-queue", "consultation-queue", "patients", "admissions", "resuscitation"],
  doctor: ["patients", "triage-queue", "consultation-queue", "lab", "radiology", "referrals", "admissions", "resuscitation", "supervision"],
  "clinical officer": ["patients", "triage-queue", "consultation-queue", "lab", "radiology", "referrals", "admissions", "resuscitation", "supervision"],
  pharmacist: ["pharmacy"],
  "lab technician": ["lab"],
  radiographer: ["radiology"],
  "billing officer": ["billing", "patients"],
};

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Front Desk", isSection: true },
  { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { title: "Front Desk", icon: Users, href: "/receptionist" },
  { title: "Appointments", icon: Calendar, href: "/appointments" },
  { title: "Patient Search", icon: Users, href: "/patients" },

  { label: "Clinical", isSection: true },
  { title: "Resuscitation", icon: HeartPulse, href: "/resuscitation" },
  { title: "Nurse Station", icon: Stethoscope, href: "/nurse-station" },
  { title: "Triage Queue", icon: List, href: "/triage-queue" },
  { title: "Consultation Queue", icon: ClipboardList, href: "/consultation-queue" },

  { label: "Supervision", isSection: true },
  { title: "Verification", icon: ShieldCheck, href: "/supervision" },

  { label: "Services", isSection: true },
  {
    title: "Pharmacy",
    icon: Pill,
    href: "/pharmacy",
    children: [
      { title: "Overview", href: "/pharmacy" },
      { title: "Dispensing", href: "/pharmacy/dispensing" },
      { title: "Inventory", href: "/pharmacy/inventory" },
      { title: "Stock Management", href: "/pharmacy/stock" },
      { title: "Stock Alerts", href: "/pharmacy/alerts" },
    ],
  },
  { title: "Laboratory", icon: FlaskConical, href: "/lab" },
  { title: "Radiology", icon: ScanLine, href: "/radiology" },

  { label: "Finance", isSection: true },
  { title: "Billing", icon: DollarSign, href: "/billing" },
  { title: "Payments", icon: CreditCard, href: "/payments" },

  { label: "Other", isSection: true },
  { title: "Queue", icon: ArrowRightLeft, href: "/queue" },
  { title: "Referrals", icon: ArrowRightLeft, href: "/referrals" },
  {
    title: "Admissions",
    icon: DoorOpen,
    href: "/admissions",
    children: [
      { title: "Overview", href: "/admissions" },
      { title: "Ward Occupancy", href: "/wards/occupancy" },
      { title: "Ward Management", href: "/wards" },
    ],
  },

  { label: "Admin", isSection: true },
  { title: "System Admin", icon: Shield, href: "/system" },
];



export function AppSidebar() {
  const { user } = useAuth();
  const { canAccessAdmin, can } = usePermissions();

  const departmentName = user?.department?.name || "Clinical Operations";
  const userRoles = (user?.roles || []).map((r) => r.toLowerCase());

  const displayRole =
    userRoles.find((r) => ROLE_NAV_MAP[r]) ||
    (departmentName.toLowerCase().includes("registration") || departmentName.toLowerCase().includes("reception") ? "receptionist" : "") ||
    (departmentName.toLowerCase().includes("pharm") ? "pharmacist" : "") ||
    (departmentName.toLowerCase().includes("lab") ? "lab technician" : "") ||
    (departmentName.toLowerCase().includes("bill") || departmentName.toLowerCase().includes("finance") ? "billing officer" : "");

  const isAdmin = userRoles.includes("admin");
  const matchedRole = displayRole || userRoles.find((r) => ROLE_NAV_MAP[r]);
  const allowedHrefs = isAdmin ? null : matchedRole ? ROLE_NAV_MAP[matchedRole] : null;

  let filteredItems = allowedHrefs
    ? filterNavItems(ALL_NAV_ITEMS, allowedHrefs)
    : ALL_NAV_ITEMS;

  // Non-admins with admin permissions still get System Admin; pure clinical roles do not.
  if (!isAdmin && !canAccessAdmin) {
    filteredItems = filteredItems.filter(
      (item) => item.href !== "/system" && item.label !== "Admin",
    );
  } else if (!isAdmin && canAccessAdmin) {
    const hasSystem = filteredItems.some((i) => i.href === "/system");
    if (!hasSystem) {
      filteredItems = [
        ...filteredItems,
        { label: "Admin", isSection: true },
        { title: "System Admin", icon: Shield, href: "/system" },
      ];
    }
  }

  if (!can("supervisor.review")) {
    filteredItems = filteredItems.filter(
      (item) => item.href !== "/supervision" && item.label !== "Supervision",
    );
  }

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

function filterNavItems(items: NavItem[], allowed: string[]): NavItem[] {
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
      const visibleItems = sectionItems.filter((item) => {
        const segment = item.href?.split("/")[1] || "";
        return allowed.includes(segment);
      });
      if (visibleItems.length > 0) {
        result.push(sectionLabel);
        result.push(...visibleItems);
      }
    } else {
      const segment = items[i].href?.split("/")[1] || "";
      if (allowed.includes(segment)) {
        result.push(items[i]);
      }
      i++;
    }
  }
  return result;
}
