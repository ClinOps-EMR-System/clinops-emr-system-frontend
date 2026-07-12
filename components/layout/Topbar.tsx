"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../store/RoleContext";
import { api } from "../../lib/api";

interface PatientResult {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  patient_category: string;
  date_of_birth: string | null;
  registration_completed_at: string | null;
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Global search state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce the query
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Run live search whenever debouncedQuery changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim() || debouncedQuery.length < 2) {
        setResults([]);
        setSearchOpen(false);
        setSearchLoading(false);
        return;
      }
      setSearchLoading(true);
      try {
        const res = await api.get(
          `/patients?search=${encodeURIComponent(debouncedQuery)}&per_page=6`,
          token
        );
        setResults(res?.data || []);
        setSearchOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }
    performSearch();
  }, [debouncedQuery, token]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        document.getElementById("global-patient-search")?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const handleResultClick = (patient: PatientResult) => {
    setSearchOpen(false);
    setQuery("");
    if (!patient.registration_completed_at) {
      router.push(`/patients/register?complete=${patient.id}`);
    } else {
      router.push(`/patients/${patient.id}/triage`);
    }
  };

  const handleViewAll = () => {
    setSearchOpen(false);
    router.push(`/patients?search=${encodeURIComponent(query)}`);
    setQuery("");
  };

  // Breadcrumbs
  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    let label = part.charAt(0).toUpperCase() + part.slice(1);
    if (label.toLowerCase() === "dashboard") label = "Dashboard";
    if (label.toLowerCase() === "patients") label = "Patient Search";
    if (label.toLowerCase() === "register") label = "Patient Registration";
    if (label.toLowerCase() === "triage") label = "Triage";
    if (label.toLowerCase() === "consultation") label = "Consultation";
    if (/^\d+$/.test(part)) label = `Patient #${part}`;
    return { label, href };
  });

  const getInitials = (name: string) =>
    name.split(" ").map((p) => p.charAt(0)).join("").toUpperCase().slice(0, 2);

  const name = user?.name || "Staff Member";
  const email = user?.email || "staff@clinops.org";
  const initials = getInitials(name);

  return (
    <header className="h-16 bg-brand-dark flex items-center gap-4 px-6 border-b border-gray-800 z-10 font-sans">

      {/* Left: Breadcrumb Tree */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 font-mono tracking-wide shrink-0">
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

      {/* Center: Global Patient Search */}
      <div className="flex-1 flex justify-center">
        <div ref={searchRef} className="relative w-full max-w-md">
          <div className="relative">
            {/* Search icon */}
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {searchLoading ? (
                <svg className="h-4 w-4 text-brand-green animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              id="global-patient-search"
              type="text"
              autoComplete="off"
              className="w-full pl-9 pr-16 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition"
              placeholder="Search patients by name, hospital #, ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
            />
            {/* Keyboard hint */}
            {!query && (
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <kbd className="text-[10px] font-mono text-gray-600 bg-gray-700/60 px-1.5 py-0.5 rounded border border-gray-600">/</kbd>
              </div>
            )}
            {/* Clear button */}
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); setSearchOpen(false); }}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-200 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Live results dropdown */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden">
              {results.length === 0 && !searchLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-400 font-mono">
                  No patients found for &ldquo;{debouncedQuery}&rdquo;
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => handleResultClick(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          {/* Avatar */}
                          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0 border border-teal-200">
                            {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {p.first_name} {p.last_name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {p.hospital_number} · {p.gender} · {p.patient_category}
                            </p>
                          </div>
                          {!p.registration_completed_at && (
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shrink-0">
                              DRAFT
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={handleViewAll}
                    className="w-full px-4 py-2.5 text-xs font-bold text-clinical-primary hover:bg-gray-50 border-t border-gray-100 text-center uppercase tracking-wide transition-colors"
                  >
                    View all results in Patient Search →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notifications */}
        <button className="text-gray-400 hover:text-white relative p-1.5 rounded-full hover:bg-gray-800/50 transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-brand-green ring-2 ring-brand-dark" />
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

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-md bg-white shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Staff Name</p>
                  <p className="text-xs text-gray-900 font-bold truncate">{name}</p>
                </div>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wide">Email</p>
                  <p className="text-xs text-gray-900 font-medium truncate">{email}</p>
                </div>
                <button
                  onClick={() => { setDropdownOpen(false); logout(); }}
                  className="w-full text-left block px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 font-bold transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
