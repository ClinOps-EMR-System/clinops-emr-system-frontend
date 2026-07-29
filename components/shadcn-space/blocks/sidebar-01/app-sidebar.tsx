"use client";

import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Logo from "@/assets/logo/logo";
import { NavItem, NavMain } from "@/components/shadcn-space/blocks/sidebar-01/nav-main";
import { useAuth } from "@/store/RoleContext";
import { LayoutDashboard, Calendar, Users, Stethoscope, ClipboardList, Ambulance, Pill, FlaskConical, DollarSign, CreditCard, ArrowRightLeft, DoorOpen, List, Shield } from "lucide-react";

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
  { title: "Front Desk", icon: Users, href: "/receptionist" },
  { title: "Appointments", icon: Calendar, href: "/appointments" },
  { title: "Patient Search", icon: Users, href: "/patients" },

  { label: "Clinical", isSection: true },
  { title: "Nurse Station", icon: Stethoscope, href: "/nurse-station" },
  { title: "Triage Queue", icon: List, href: "/triage-queue" },
  { title: "Consultation Queue", icon: ClipboardList, href: "/consultation-queue" },
  { title: "Emergency Queue", icon: Ambulance, href: "/emergency-queue" },

  { label: "Services", isSection: true },
  { title: "Pharmacy", icon: Pill, href: "/pharmacy" },
  { title: "Laboratory", icon: FlaskConical, href: "/lab" },

  { label: "Finance", isSection: true },
  { title: "Billing", icon: DollarSign, href: "/billing" },
  { title: "Payments", icon: CreditCard, href: "/payments" },

  { label: "Other", isSection: true },
  { title: "Queue", icon: ArrowRightLeft, href: "/queue" },
  { title: "Referrals", icon: ArrowRightLeft, href: "/referrals" },
  { title: "Admissions", icon: DoorOpen, href: "/admissions" },

  { label: "Admin", isSection: true },
  { title: "Admin", icon: Shield, href: "/admin" },
];

export function AppSidebar() {
  const { user } = useAuth();

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

  const filteredItems = allowedHrefs
    ? filterNavItems(ALL_NAV_ITEMS, allowedHrefs)
    : ALL_NAV_ITEMS;

  return (
    <Sidebar className="px-0 h-full [&_[data-slot=sidebar-inner]]:h-full">
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
                      <p className="text-base font-semibold text-card-foreground text-center">
                        Grab Pro Now
                      </p>
                      <p className="text-sm font-regular text-muted-foreground text-center">
                        Customize your admin
                      </p>
                    </div>
                    <Button className="w-fit h-9 px-4 py-2 shadow-none cursor-pointer rounded-xl">
                      Get Premium
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
        const segment = item.href?.replace("/app/", "").replace("/", "") || "";
        return allowed.includes(segment);
      });
      if (visibleItems.length > 0) {
        result.push(sectionLabel);
        result.push(...visibleItems);
      }
    } else {
      const segment = items[i].href?.replace("/app/", "").replace("/", "") || "";
      if (allowed.includes(segment)) {
        result.push(items[i]);
      }
      i++;
    }
  }
  return result;
}
