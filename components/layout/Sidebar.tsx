"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../store/RoleContext";
import clsx from "clsx";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const departmentName = user?.department?.name || "Clinical Operations";
  const userRoles = (user?.roles || []).map((r) => r.toLowerCase());

  const ROLE_NAV_MAP: Record<string, string[]> = {
    receptionist: ["receptionist", "appointments", "queue", "patients"],
    nurse: ["triage-queue", "patients", "pharmacy", "admissions"],
    doctor: ["patients", "lab", "referrals"],
    "clinical officer": ["patients", "lab", "referrals"],
    pharmacist: ["pharmacy"],
    "lab technician": ["lab"],
    "billing officer": ["billing", "patients"],
  };

  // Derive a display role from roles OR department name
  const displayRole =
    userRoles.find((r) => ROLE_NAV_MAP[r]) ||
    (departmentName.toLowerCase().includes("registration") || departmentName.toLowerCase().includes("reception") ? "receptionist" : "") ||
    (departmentName.toLowerCase().includes("pharm") ? "pharmacist" : "") ||
    (departmentName.toLowerCase().includes("lab") ? "lab technician" : "") ||
    (departmentName.toLowerCase().includes("bill") || departmentName.toLowerCase().includes("finance") ? "billing officer" : "");

  const navLinks: NavItem[] = [
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
      name: "Front Desk",
      href: "/receptionist",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      name: "Appointments",
      href: "/appointments",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
    },
    {
      name: "Triage Queue",
      href: "/triage-queue",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      name: "Queue",
      href: "/queue",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      name: "Pharmacy",
      href: "/pharmacy",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ),
    },
    {
      name: "Laboratory",
      href: "/lab",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      name: "Billing",
      href: "/billing",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Payments",
      href: "/payments",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: "Referrals",
      href: "/referrals",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      name: "Admissions",
      href: "/admissions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      name: "Admin",
      href: "/admin",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const isAdmin = userRoles.includes("admin");
  const matchedRole = displayRole || userRoles.find((r) => ROLE_NAV_MAP[r]);
  const allowedHrefs = isAdmin ? null : matchedRole ? ROLE_NAV_MAP[matchedRole] : null;
  const filteredLinks = allowedHrefs
    ? navLinks.filter((link) => {
        const linkSegment = link.href.replace("/app/", "").replace("/", "");
        return allowedHrefs.includes(linkSegment);
      })
    : navLinks;

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 bg-brand-dark flex flex-col justify-between h-full flex-shrink-0 border-r border-gray-800 font-sans transition-all duration-200",
          "lg:relative lg:translate-x-0",
          collapsed ? "w-0 lg:w-16 overflow-hidden lg:overflow-visible" : "w-64"
        )}
      >
        <div>
          {/* Sidebar Header */}
          <div className={clsx(
            "h-16 flex items-center border-b border-gray-800",
            collapsed ? "justify-center px-2" : "px-6"
          )}>
            {collapsed ? (
              <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center text-white font-extrabold text-lg">
                C
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-brand-green rounded flex items-center justify-center text-white font-extrabold text-lg">
                  C
                </div>
                <span className="text-white font-bold text-lg tracking-tight">ClinOps EMR</span>
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="mt-6" aria-label="Main navigation">
            {!collapsed && (
              <div className="px-6 mb-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  {departmentName}
                </span>
              </div>
            )}
            <ul className="space-y-1">
              {filteredLinks.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.name : undefined}
                      className={clsx(
                        "flex items-center transition-all duration-150 relative",
                        collapsed ? "justify-center px-2 py-3" : "px-6 py-3",
                        isActive
                          ? "bg-gray-800/80 text-white font-semibold border-l-4 border-brand-green"
                          : "text-gray-400 hover:text-white hover:bg-gray-800/30"
                      )}
                    >
                      <span className={clsx(
                        isActive ? "text-brand-green" : "text-gray-400",
                        !collapsed && "mr-3"
                      )}>
                        {item.icon}
                      </span>
                      {!collapsed && item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className={clsx(
          "p-4 border-t border-gray-800 text-[10px] text-gray-500 flex items-center font-mono",
          collapsed ? "justify-center" : "gap-1.5"
        )}>
          <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse"></span>
          {!collapsed && "SYSTEM ONLINE"}
        </div>
      </aside>

      {/* Desktop toggle button — anchored to the sidebar edge */}
      <button
        onClick={onToggle}
        className="hidden lg:flex absolute top-20 z-50 items-center justify-center w-5 h-10 rounded-r-md bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors border border-l-0 border-gray-700"
        style={{ left: collapsed ? '4rem' : '16rem' }}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          className={clsx("w-3.5 h-3.5 transition-transform duration-200", collapsed && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </>
  );
}
