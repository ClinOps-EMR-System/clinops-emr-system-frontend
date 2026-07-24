"use client";

import Link from "next/link";

const actions = [
  {
    label: "Register Patient",
    href: "/patients/register",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: "bg-brand-green/10 text-brand-green",
  },
  {
    label: "New Appointment",
    href: "/appointments",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: "bg-sky-100 text-sky-600",
  },
  {
    label: "Collect Payment",
    href: "/payments",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    color: "bg-amber-100 text-amber-600",
  },
  {
    label: "Search Patient",
    href: "/patients",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: "bg-purple-100 text-purple-600",
  },
  {
    label: "Emergency Reg.",
    href: "/patients/register?emergency=true",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    color: "bg-red-100 text-red-600",
  },
];

export function QuickActions() {
  return (
    <div className="bg-white rounded border border-[#becab7]/50 p-6">
      <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all"
          >
            <div className={`h-9 w-9 rounded flex items-center justify-center ${action.color}`}>
              {action.icon}
            </div>
            <span className="text-sm font-bold text-gray-700">{action.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
