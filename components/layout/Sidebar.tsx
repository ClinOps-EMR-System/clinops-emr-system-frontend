"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../store/RoleContext";
import { useMemo } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permissions?: string[];
  roles?: string[];
}

const allNavLinks: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    name: "Patient Search",
    href: "/patients",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    permissions: ["patient.view"],
  },
  {
    name: "Registration",
    href: "/patients/register",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    permissions: ["registration.create"],
  },
  {
    name: "Triage Queue",
    href: "/triage",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    permissions: ["triage.view"],
  },
  {
    name: "Lab Queue",
    href: "/lab",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    permissions: ["lab.view_results"],
  },
  {
    name: "Pharmacy",
    href: "/pharmacy",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    permissions: ["prescription.view"],
  },
  {
    name: "Billing",
    href: "/billing",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    permissions: ["billing.view"],
  },
  {
    name: "Administration",
    href: "/admin",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    permissions: ["user.manage"],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const departmentName = user?.department?.name || "Clinical Operations";
  const userRoles = user?.roles || [];
  const userPermissions = user?.permissions || [];

  const navLinks = useMemo(() => {
    return allNavLinks.filter((item) => {
      if (!item.permissions && !item.roles) return true;
      if (item.permissions && item.permissions.some((p) => userPermissions.includes(p))) return true;
      if (item.roles && item.roles.some((r) => userRoles.includes(r))) return true;
      return false;
    });
  }, [userPermissions, userRoles]);

  return (
    <aside className="w-64 bg-brand-dark flex flex-col justify-between h-full flex-shrink-0 border-r border-gray-800 z-20 font-sans">
      <div>
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center text-white font-extrabold text-lg">
              C
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ClinOps EMR</span>
          </div>
        </div>

        <nav className="mt-6">
          <div className="px-6 mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {departmentName}
            </span>
          </div>
          <ul className="space-y-1">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center px-6 py-3 transition-all duration-150 relative ${
                      isActive
                        ? "bg-gray-800/80 text-white font-semibold border-l-4 border-brand-green"
                        : "text-gray-400 hover:text-white hover:bg-gray-800/30"
                    }`}
                  >
                    <span className={`mr-3 ${isActive ? "text-brand-green" : "text-gray-400"}`}>
                      {item.icon}
                    </span>
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="p-4 border-t border-gray-800 text-[10px] text-gray-500 flex items-center gap-1.5 font-mono">
        <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse"></span>
        SYSTEM ONLINE
      </div>
    </aside>
  );
}
