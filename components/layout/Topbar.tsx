"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../store/RoleContext";
import { api } from "../../lib/api";
import { X, Search, Bell, ChevronDown, Check } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";

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

interface NotificationItem {
  id: number;
  patient_id: number | null;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<(NotificationItem & { relative_time: string })[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

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
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Auto-focus mobile search input when expanded
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  const computeRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications", token);
      const items = (res?.notifications ?? []).map((n: NotificationItem) => ({
        ...n,
        relative_time: computeRelativeTime(n.created_at),
      }));
      setNotifications(items);
      setUnreadCount(res?.unread_count ?? 0);
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications(); // eslint-disable-line react-hooks/set-state-in-effect
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`, {}, token);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read-all", {}, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silent
    }
  };

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
    const labelMap: Record<string, string> = {
      dashboard: "Dashboard",
      patients: "Patient Search",
      register: "Patient Registration",
      triage: "Triage",
      consultation: "Consultation",
      pharmacy: "Pharmacy",
      lab: "Laboratory",
      billing: "Billing",
      referrals: "Referrals",
      admissions: "Admissions",
      admin: "Administration",
      "ward-round": "Ward Round",
      "discharge-summary": "Discharge Summary",
      "triage-queue": "Triage Queue",
      "emergency-queue": "Triage Queue",
      "chronic-care": "Chronic Care",
    };
    if (labelMap[label.toLowerCase()]) label = labelMap[label.toLowerCase()];
    if (/^\d+$/.test(part)) label = `Patient #${part}`;
    return { label, href };
  });

  const getInitials = (name: string) =>
    name.split(" ").map((p) => p.charAt(0)).join("").toUpperCase().slice(0, 2);

  const name = user?.name || "Staff Member";
  const email = user?.email || "staff@clinops.org";
  const initials = getInitials(name);

  return (
    <header className="h-16 bg-sidebar flex items-center gap-4 px-4 md:px-6 border-b border-sidebar-border z-10 font-sans">

      <SidebarTrigger className="lg:hidden text-sidebar-foreground/70 hover:text-sidebar-foreground p-1.5 rounded-md hover:bg-sidebar-accent transition-colors cursor-pointer" />

      {/* Breadcrumbs — last crumb visible on mobile, full trail on sm+ */}
      <nav aria-label="Breadcrumb" className="flex items-center shrink-0">
        <ol className="flex items-center gap-1.5 text-[11px] font-bold font-mono tracking-wide">
          <li className="inline-flex items-center">
            <Link href="/dashboard" className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors uppercase inline-flex items-center min-h-0 min-w-0 h-auto py-0">
              <span className="sm:hidden">⌂</span>
              <span className="hidden sm:inline">Home</span>
            </Link>
          </li>
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            // On mobile, hide intermediate crumbs (show only last)
            if (!isLast && idx < breadcrumbs.length - 1) {
              return (
                <li key={idx} className="inline-flex items-center gap-1.5 hidden sm:inline-flex">
                  <span className="text-sidebar-foreground/50 select-none inline-flex items-center" aria-hidden="true">/</span>
                  <Link href={crumb.href} className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors uppercase inline-flex items-center min-h-0 min-w-0 h-auto py-0">
                    {crumb.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={idx} className="inline-flex items-center gap-1.5">
                <span className="text-sidebar-foreground/50 select-none inline-flex items-center" aria-hidden="true">/</span>
                {isLast ? (
                  <span className="text-sidebar-primary font-bold uppercase inline-flex items-center" aria-current="page">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors uppercase inline-flex items-center min-h-0 min-w-0 h-auto py-0">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Global Patient Search — collapsible on mobile */}
      <div className="flex-1 flex justify-center">
        {/* Mobile: search icon button, expands to full bar on tap */}
        <div className="lg:hidden flex-1 flex justify-end" ref={searchRef}>
          {mobileSearchOpen ? (
            <div className="relative w-full flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {searchLoading ? (
                    <svg className="h-4 w-4 text-sidebar-primary animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Search className="h-4 w-4 text-sidebar-foreground/60" />
                  )}
                </div>
                <input
                  ref={mobileSearchInputRef}
                  type="text"
                  autoComplete="off"
                  className="w-full pl-9 pr-9 py-2 rounded-md bg-sidebar-accent border border-sidebar-border text-sidebar-foreground placeholder-sidebar-foreground/60 text-sm focus:outline-none focus:border-sidebar-primary focus:ring-1 focus:ring-sidebar-primary transition"
                  placeholder="Search name, hospital #..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setSearchOpen(true)}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(""); setResults([]); setSearchOpen(false); }}
                    className="absolute inset-y-0 right-3 flex items-center text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(false); setQuery(""); setResults([]); setSearchOpen(false); }}
                className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-md hover:bg-sidebar-accent transition-colors shrink-0"
                aria-label="Close search"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setMobileSearchOpen(true)}
              className="p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground rounded-md hover:bg-sidebar-accent transition-colors"
              aria-label="Open patient search"
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          {/* Search results dropdown for mobile */}
          {searchOpen && mobileSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden mx-4">
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
                          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold shrink-0 border border-teal-200">
                            {p.first_name.charAt(0)}{p.last_name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {p.first_name} {p.last_name}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">
                              {p.hospital_number} · {p.gender}
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
                    View all results →
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Desktop: full search bar */}
        <div ref={searchRef} className="relative w-full max-w-md hidden lg:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {searchLoading ? (
                  <svg className="h-4 w-4 text-sidebar-primary animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Search className="h-4 w-4 text-sidebar-foreground/60" />
                )}
              </div>
              <input
                id="global-patient-search"
                type="text"
                autoComplete="off"
                className="w-full pl-9 pr-16 py-2 rounded-md bg-sidebar-accent border border-sidebar-border text-sidebar-foreground placeholder-sidebar-foreground/60 text-sm focus:outline-none focus:border-sidebar-primary focus:ring-1 focus:ring-sidebar-primary transition"
              placeholder="Search patients by name, hospital #, ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => results.length > 0 && setSearchOpen(true)}
            />
            {!query && (
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                <kbd className="text-[10px] font-mono text-sidebar-foreground/50 bg-sidebar-accent/70 px-1.5 py-0.5 rounded border border-sidebar-border">/</kbd>
              </div>
            )}
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setResults([]); setSearchOpen(false); }}
                className="absolute inset-y-0 right-3 flex items-center text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

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
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground relative p-2 rounded-full hover:bg-sidebar-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-sidebar">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white shadow-xl border border-gray-200 z-20 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          handleMarkRead(n.id);
                          if (n.patient_id) {
                            setNotifOpen(false);
                            router.push(`/patients/${n.patient_id}`);
                          }
                        }}
                        className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          !n.read ? "bg-teal-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <span className="mt-1.5 h-2 w-2 rounded-full bg-teal-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{n.title}</p>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1 font-mono">
                              {n.relative_time}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 cursor-pointer p-1 rounded-md hover:bg-sidebar-accent/80 focus:outline-none transition-colors"
            aria-label="User menu"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold font-mono border border-sidebar-primary">
              {initials}
            </div>
            <span className="hidden md:inline-block text-sm text-sidebar-foreground/80 font-medium max-w-[120px] truncate">
              {name}
            </span>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 hidden md:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-52 rounded-md bg-white shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20" role="menu">
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
                  role="menuitem"
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
