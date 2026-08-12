"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Menu, ChevronDown } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdminSidebar } from "./AdminSidebarContext";
import { adminApi } from "@/lib/services/admin";
import { Button } from "@/components/ui/button";

function getInitials(name: string) {
  return name.split(" ").map((p) => p.charAt(0)).join("").toUpperCase().slice(0, 2);
}

function handleMenuKeyDown(e: React.KeyboardEvent, closeMenu: () => void) {
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
    const nextIndex = e.key === "ArrowDown"
      ? currentIndex < items.length - 1 ? currentIndex + 1 : 0
      : currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    items[nextIndex].focus();
  }
}

export function AdminTopbar() {
  const { user, token, logout } = useAuth();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useAdminSidebar();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const name = user?.name || "Staff Member";
  const email = user?.email || "staff@clinops.org";
  const initials = getInitials(name);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await adminApi.logout(token);
    } catch {
      /* still clear local session */
    }
    logout();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            onClick={() => setOpenMobile(true)}
            className="p-2 -ml-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-md transition-colors"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <p className="truncate text-sm font-medium text-sidebar-foreground">
          Hospital administration
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
          EMR
        </Button>

        {/* User Menu */}
        <div className="relative" ref={dropdownRef}>
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
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} aria-hidden="true" />
              <div className="absolute right-0 mt-2 w-52 rounded-md bg-[var(--surface)] shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-20" role="menu" onKeyDown={(e) => handleMenuKeyDown(e, () => setDropdownOpen(false))}>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Staff Name</p>
                  <p className="text-xs text-gray-900 font-bold truncate">{name}</p>
                </div>
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">Email</p>
                  <p className="text-xs text-gray-900 font-medium truncate">{email}</p>
                </div>
                <button
                  onClick={handleLogout}
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
