"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Shield,
  ScrollText,
  Building2,
  BedDouble,
  Package,
  Settings,
  Lock,
  Stethoscope,
} from "lucide-react";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { cn } from "@/lib/utils";

type NavLink = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string | string[];
};

type NavGroup = {
  label: string;
  items: NavLink[];
};

const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [{ title: "Overview", href: "/system", icon: LayoutDashboard }],
  },
  {
    label: "Access",
    items: [
      { title: "Staff", href: "/system/staff", icon: Users, permission: "user.manage" },
      { title: "Roles", href: "/system/roles", icon: Shield, permission: "role.manage" },
      { title: "Audit Log", href: "/system/audit", icon: ScrollText, permission: "audit.view" },
    ],
  },
  {
    label: "Structure",
    items: [
      {
        title: "Departments",
        href: "/system/departments",
        icon: Building2,
        permission: "department.manage",
      },
      {
        title: "Wards & Beds",
        href: "/system/wards",
        icon: BedDouble,
        permission: ["ward.view", "ward.edit"],
      },
    ],
  },
  {
    label: "Catalogs",
    items: [
      {
        title: "Services",
        href: "/system/catalogs/services",
        icon: Package,
        permission: ["catalog.manage", "billing.view"],
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Security",
        href: "/system/security",
        icon: Lock,
        permission: ["settings.manage", "user.manage"],
      },
      {
        title: "Hospital Settings",
        href: "/system/settings",
        icon: Settings,
        permission: "settings.manage",
      },
    ],
  },
];

function allowed(
  can: (p: string) => boolean,
  permission?: string | string[],
) {
  if (!permission) return true;
  if (Array.isArray(permission)) return permission.some((p) => can(p));
  return can(permission);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { can } = usePermissions();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--outline)] bg-[var(--sidebar)]">
      <div className="flex h-14 items-center gap-2 border-b border-[var(--outline)] px-4">
        <Shield className="h-5 w-5 text-[var(--clinical-primary)]" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--clinical-text)]">
            System Admin
          </p>
          <p className="truncate text-[11px] text-[var(--clinical-muted)]">
            ClinOps console
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((item) =>
            allowed(can, item.permission),
          );
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5">
              <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wide text-[var(--clinical-muted)]">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/system"
                      ? pathname === "/system"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors duration-150",
                          active
                            ? "bg-[var(--clinical-primary)]/10 font-medium text-[var(--clinical-primary)]"
                            : "text-[var(--clinical-text)] hover:bg-black/5",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-[var(--outline)] p-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--clinical-muted)] transition-colors hover:bg-black/5 hover:text-[var(--clinical-text)]"
        >
          <Stethoscope className="h-4 w-4" />
          Clinical EMR
        </Link>
      </div>
    </aside>
  );
}
