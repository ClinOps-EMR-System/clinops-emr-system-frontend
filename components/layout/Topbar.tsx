"use client";

import { useState } from "react";
import { useAuth } from "../../store/RoleContext";

export default function Topbar() {
  const { user, logout, activeRole, setActiveRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const name = user?.name || "Staff Member";
  const initials = getInitials(name);
  const department = user?.department || "General Ward";

  // Map active role name to readable text
  const getRoleLabel = (r: string) => {
    if (r === "clerk") return "Registration Clerk";
    if (r === "nurse") return "Triage Nurse";
    if (r === "clinician") return "Clinician / Doctor";
    return r.replace("-", " ");
  };

  return (
    <header className="h-16 bg-brand-dark flex items-center justify-between px-6 border-b border-gray-800 z-10 font-sans">
      {/* Quick Search Shortcut */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            className="block w-full pl-10 pr-3 py-1.5 border border-transparent rounded-md leading-5 bg-gray-800 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-white focus:text-gray-900 focus:ring-1 focus:ring-brand-green focus:border-brand-green sm:text-sm transition duration-150 ease-in-out font-sans"
            placeholder="Search patient or record ID..."
            type="text"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="ml-4 flex items-center gap-4">
        {/* Active Workspace Badge */}
        <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-brand-green border border-gray-700 uppercase tracking-wider font-mono">
          {getRoleLabel(activeRole)}
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
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Active Desk</p>
                  <select
                    value={activeRole}
                    onChange={(e) => {
                      setActiveRole(e.target.value);
                      setDropdownOpen(false);
                    }}
                    className="mt-1 w-full text-xs font-bold uppercase border border-gray-200 rounded px-2 py-1.5 bg-gray-50 text-gray-800 focus:outline-none focus:border-brand-green"
                  >
                    <option value="clerk">Registration Clerk</option>
                    <option value="nurse">Triage Nurse</option>
                    <option value="clinician">Clinician / Doctor</option>
                    <option value="lab-technician">Lab Technician</option>
                    <option value="pharmacist">Pharmacist</option>
                    <option value="billing-officer">Billing Officer</option>
                  </select>
                </div>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Staff Name</p>
                  <p className="text-xs text-gray-900 font-bold truncate">{name}</p>
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
