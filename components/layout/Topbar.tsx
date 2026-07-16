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
  const { token } = useAuth();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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

  const pathParts = pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const href = "/" + pathParts.slice(0, index + 1).join("/");
    let label = part.charAt(0).toUpperCase() + part.slice(1);
    if (label.toLowerCase() === "dashboard") label = "Dashboard";
    if (label.toLowerCase() === "patients") label = "Patient Search";
    if (label.toLowerCase() === "register") label = "Patient Registration";
    if (label.toLowerCase() === "triage") label = "Triage";
    if (label.toLowerCase() === "consultation") label = "Consultation";
    if (label.toLowerCase() === "pharmacy") label = "Pharmacy";
    if (label.toLowerCase() === "lab") label = "Laboratory";
    if (label.toLowerCase() === "billing") label = "Billing";
    if (label.toLowerCase() === "referrals") label = "Referrals";
    if (label.toLowerCase() === "admissions") label = "Admissions";
    if (label.toLowerCase() === "admin") label = "Administration";
    if (/^\d+$/.test(part)) label = `Patient #${part}`;
    return { label, href };
  });

  return (
    <header className="h-14 bg-white flex items-center gap-4 px-6 border-b border-clinical-outline z-10 font-sans shrink-0">

      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-clinical-muted font-mono tracking-wide shrink-0">
        <Link href="/dashboard" className="hover:text-clinical-text transition-colors uppercase">
          Home
        </Link>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span className="text-clinical-outline font-sans text-xs">/</span>
            {idx === breadcrumbs.length - 1 ? (
              <span className="text-clinical-primary font-bold uppercase">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-clinical-text transition-colors uppercase">
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Center: Search */}
      <div className="flex-1 flex justify-center">
        <div ref={searchRef} className="relative w-full max-w-md">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {searchLoading ? (
                <svg className="h-4 w-4 text-clinical-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="h-4 w-4 text-clinical-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
            <input
              id="global-patient-search"
              type="text"
              autoComplete="off"
              className="w-full pl-9 pr-16 py-2 rounded-md bg-clinical-bg border border-clinical-outline text-clinical-text placeholder-clinical-muted text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary transition"
              placeholder="Search patients by name, hospital #, ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
            />
            {!query && (
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <kbd className="text-[10px] font-mono text-clinical-muted bg-clinical-outline/50 px-1.5 py-0.5 rounded border border-clinical-outline">/</kbd>
              </div>
            )}
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); setSearchOpen(false); }}
                className="absolute inset-y-0 right-3 flex items-center text-clinical-muted hover:text-clinical-text transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-md shadow-2xl border border-clinical-outline z-50 overflow-hidden">
              {results.length === 0 && !searchLoading ? (
                <div className="px-4 py-6 text-center text-sm text-clinical-muted font-mono">
                  No patients found for &ldquo;{debouncedQuery}&rdquo;
                </div>
              ) : (
                <>
                  <ul className="divide-y divide-clinical-outline/50 max-h-72 overflow-y-auto">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => handleResultClick(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-clinical-bg transition-colors text-left"
                        >
                          <div className="h-8 w-8 rounded-full bg-[#70C8BA]/20 flex items-center justify-center text-[#2A7066] text-xs font-bold shrink-0 border border-[#70C8BA]/40">
                            {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-clinical-text truncate">
                              {p.first_name} {p.last_name}
                            </p>
                            <p className="text-xs text-clinical-muted font-mono">
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
                    className="w-full px-4 py-2.5 text-xs font-bold text-clinical-primary hover:bg-clinical-bg border-t border-clinical-outline text-center uppercase tracking-wide transition-colors"
                  >
                    View all results in Patient Search →
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Notifications only */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="text-clinical-muted hover:text-clinical-text relative p-1.5 rounded-full hover:bg-clinical-bg transition-colors">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-clinical-primary ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}
