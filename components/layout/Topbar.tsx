"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../store/RoleContext";
import { api } from "../../lib/api";
import { X, Search, Bell, ChevronDown } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import type { NotificationData } from "@/types/admission";
import { formatDistanceToNow } from "date-fns";

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
  id: string;
  type: "order" | "result" | "status";
  title: string;
  message: string;
  patient?: string;
  patientId?: number;
  priority?: string;
  timestamp: Date;
  read: boolean;
}

function mapNotification(n: NotificationData): NotificationItem {
  const type: NotificationItem["type"] = n.type.startsWith("order")
    ? "order"
    : n.type.includes("result")
    ? "result"
    : "status";

  return {
    id: String(n.id),
    type,
    title: n.title,
    message: n.message,
    patientId: n.patient_id ?? undefined,
    timestamp: new Date(n.created_at),
    read: Boolean(n.read),
  };
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, token } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const handleMenuKeyDown = (e: React.KeyboardEvent, closeMenu: () => void) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const menu = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[role="menu"]');
      if (!menu) return;
      const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"], button:not([disabled])'));
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number;
      if (e.key === "ArrowDown") {
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
      }
      items[nextIndex].focus();
    }
  };

  const {
    notifications: dbNotifications,
    markRead,
    markAllRead,
  } = useRealtimeNotifications();

  const notifications = useMemo(
    () => dbNotifications.filter((n) => !dismissedIds.includes(n.id)).map(mapNotification),
    [dbNotifications, dismissedIds]
  );

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
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
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  const markAsRead = (id: string) => {
    markRead(Number(id));
  };

  const markAllAsRead = () => {
    markAllRead();
  };

  const clearAll = () => {
    setDismissedIds((prev) => [...new Set([...prev, ...dbNotifications.map((n) => n.id)])]);
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

      {/* Breadcrumbs */}
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

      {/* Global Patient Search */}
      <div className="flex-1 flex justify-center">
        <div className="lg:hidden flex-1 flex justify-end" ref={searchRef}>
          {mobileSearchOpen ? (
            <div className="relative w-full flex items-center gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {searchLoading ? (
                    <svg aria-hidden="true" className="h-4 w-4 text-sidebar-primary animate-spin" fill="none" viewBox="0 0 24 24">
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
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {searchOpen && mobileSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden mx-4">
              {results.length === 0 && !searchLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500 font-mono">
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
                            <p className="text-xs text-gray-500 font-mono">
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

        <div ref={searchRef} className="relative w-full max-w-md hidden lg:block">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {searchLoading ? (
                <svg aria-hidden="true" className="h-4 w-4 text-sidebar-primary animate-spin" fill="none" viewBox="0 0 24 24">
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
                <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {searchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-md shadow-2xl border border-gray-200 z-50 overflow-hidden">
              {results.length === 0 && !searchLoading ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500 font-mono">
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
                            <p className="text-xs text-gray-500 font-mono">
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
        {/* Notification Bell */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground relative p-2 rounded-full hover:bg-sidebar-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-sidebar" />
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-2xl border border-gray-200 z-20 overflow-hidden" role="menu" onKeyDown={(e) => handleMenuKeyDown(e, () => setNotificationsOpen(false))}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-y-auto max-h-80">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-gray-500">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => {
                          markAsRead(notification.id);
                          if (notification.patientId) {
                            setNotificationsOpen(false);
                            router.push(`/patients/${notification.patientId}/consultation`);
                          }
                        }}
                        className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          !notification.read ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`shrink-0 mt-0.5 p-1.5 rounded-full ${
                              notification.type === "order"
                                ? "bg-blue-100"
                                : notification.type === "result"
                                ? "bg-green-100"
                                : "bg-amber-100"
                            }`}
                          >
                            {notification.type === "order" && (
                              <svg aria-hidden="true" className="h-3.5 w-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            )}
                            {notification.type === "result" && (
                              <svg aria-hidden="true" className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {notification.type === "status" && (
                              <svg aria-hidden="true" className="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${!notification.read ? "text-gray-900" : "text-gray-700"}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 truncate">{notification.message}</p>
                            {notification.patient && (
                              <p className="text-xs text-gray-500 mt-1">Patient: {notification.patient}</p>
                            )}
                            {notification.priority && (
                              <span className={`inline-block mt-1 px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                                notification.priority === "Stat"
                                  ? "bg-red-100 text-red-700"
                                  : notification.priority === "Urgent"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}>
                                {notification.priority}
                              </span>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Menu */}
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
              <div className="absolute right-0 mt-2 w-52 rounded-md bg-white shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20" role="menu" onKeyDown={(e) => handleMenuKeyDown(e, () => setDropdownOpen(false))}>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Staff Name</p>
                  <p className="text-xs text-gray-900 font-bold truncate">{name}</p>
                </div>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Email</p>
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
