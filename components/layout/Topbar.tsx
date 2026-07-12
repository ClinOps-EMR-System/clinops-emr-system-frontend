"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../store/RoleContext";

export default function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Construct breadcrumbs hierarchy
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    let label = part.charAt(0).toUpperCase() + part.slice(1);
    if (label.toLowerCase() === "dashboard") label = "Dashboard";
    if (label.toLowerCase() === "patients") label = "Patients";
    if (label.toLowerCase() === "register") label = "Register Intake";
    if (label.toLowerCase() === "triage") label = "Triage";
    if (label.toLowerCase() === "consultation") label = "Consultation";
    if (/^\d+$/.test(part)) {
      label = `Patient #${part}`;
    }
    return { label, href };
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const name = user?.name || "Staff Member";
  const email = user?.email || "staff@clinops.org";
  const initials = getInitials(name);
  const departmentName = user?.department?.name || "Clinical Operations";

  return (
    <header className="h-16 bg-brand-dark flex items-center justify-between px-6 border-b border-gray-800 z-10 font-sans">
      {/* Breadcrumb Tree Locator */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 font-mono tracking-wide">
        <Link href="/dashboard" className="hover:text-white transition-colors uppercase">
          Home
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span className="text-gray-600 font-sans text-xs">/</span>
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-brand-green font-bold uppercase">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-white transition-colors uppercase">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Right Side Actions */}
      <div className="ml-4 flex items-center gap-4">
        {/* Active Department Badge */}
        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-brand-green border border-gray-700 uppercase tracking-wider font-mono">
          {departmentName}
        </span>

        {/* Notifications Icon */}
        <button className="text-gray-400 hover:text-white relative p-1.5 rounded-full hover:bg-gray-800/50 transition-colors">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-brand-green ring-2 ring-brand-dark"></span>
        </button>

        {/* Staff Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-gray-800/40 focus:outline-none transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-teal-700 flex items-center justify-center text-white text-xs font-bold font-mono border border-teal-600">
              {initials}
            </div>
            <span className="hidden md:inline-block text-sm text-gray-300 font-medium max-w-[120px] truncate">
              {name}
            </span>
            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen ? (
            <>
              {/* Overlay background to dismiss */}
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
              
              <div className="absolute right-0 mt-2 w-52 rounded-md bg-white shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20 focus:outline-none">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Staff Name</p>
                  <p className="text-xs text-gray-900 font-bold truncate">{name}</p>
                </div>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Email</p>
                  <p className="text-xs text-gray-900 font-medium truncate">{email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left block px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-bold transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
