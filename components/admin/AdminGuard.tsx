"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { canAccessAdmin } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (!canAccessAdmin) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, canAccessAdmin, router]);

  if (isLoading || !isAuthenticated || !canAccessAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--clinical-bg)] text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  return <>{children}</>;
}
