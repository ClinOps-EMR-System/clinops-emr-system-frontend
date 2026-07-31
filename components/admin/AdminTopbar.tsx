"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import { Button } from "@/components/ui/button";

export function AdminTopbar() {
  const { user, token, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await adminApi.logout(token);
    } catch {
      /* still clear local session */
    }
    logout();
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--outline)] bg-white px-6">
      <div className="min-w-0">
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
          Log out
        </Button>
      </div>
    </header>
  );
}
