"use client";

import Link from "next/link";
import { LogOut, Menu } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAdminSidebar } from "./AdminSidebarContext";
import { adminApi } from "@/lib/services/admin";
import { Button } from "@/components/ui/button";

export function AdminTopbar() {
  const { user, token, logout } = useAuth();
  const isMobile = useIsMobile();
  const { setOpenMobile } = useAdminSidebar();

  const handleLogout = async () => {
    try {
      await adminApi.logout(token);
    } catch {
      /* still clear local session */
    }
    logout();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--outline)] bg-white px-4 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {isMobile && (
          <button
            onClick={() => setOpenMobile(true)}
            className="p-2 -ml-2 text-[var(--clinical-muted)] hover:text-[var(--clinical-text)] hover:bg-black/5 rounded-md transition-colors"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <p className="truncate text-sm font-medium text-[var(--clinical-text)]">
          Hospital administration
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-[var(--clinical-text)]">
            {user?.name || user?.email}
          </p>
          <p className="text-xs text-[var(--clinical-muted)]">
            {(user?.roles || []).join(", ") || "Staff"}
          </p>
        </div>
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dashboard" />}>
          EMR
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 text-[var(--clinical-muted)]"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </Button>
      </div>
    </header>
  );
}
