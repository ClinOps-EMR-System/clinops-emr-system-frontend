"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Pill,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface BottomNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPatterns?: string[];
}

const PRIMARY_ITEMS: BottomNavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
    matchPatterns: ["/dashboard"],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    matchPatterns: ["/patients", "/receptionist", "/register"],
  },
  {
    label: "Queue",
    href: "/triage-queue",
    icon: ClipboardList,
    matchPatterns: ["/triage-queue", "/consultation-queue", "/emergency-queue", "/queue", "/nurse-station", "/resuscitation"],
  },
  {
    label: "Pharmacy",
    href: "/pharmacy",
    icon: Pill,
    matchPatterns: ["/pharmacy"],
  },
];

const MORE_ITEMS: BottomNavItem[] = [
  { label: "Lab", href: "/lab", icon: Pill },
  { label: "Billing", href: "/billing", icon: Pill },
  { label: "Admissions", href: "/admissions", icon: Pill },
  { label: "Referrals", href: "/referrals", icon: Pill },
  { label: "Radiology", href: "/radiology", icon: Pill },
  { label: "Appointments", href: "/appointments", icon: Pill },
  { label: "System Admin", href: "/system", icon: Pill },
];

function isActive(pathname: string, item: BottomNavItem): boolean {
  if (item.matchPatterns) {
    return item.matchPatterns.some((pattern) => pathname === pattern || pathname.startsWith(pattern + "/"));
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function BottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-16">
        {PRIMARY_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors min-w-0",
                active
                  ? "text-clinical-primary"
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className={cn(
                "text-[10px] font-medium leading-tight truncate",
                active && "font-bold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
        {/* More button — opens the sidebar sheet as fallback */}
        <Link
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // Trigger the sidebar sheet open via a custom event
            window.dispatchEvent(new CustomEvent("open-sidebar"));
          }}
          className="flex flex-col items-center justify-center gap-0.5 w-full h-full text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-tight">More</span>
        </Link>
      </div>
    </nav>
  );
}
