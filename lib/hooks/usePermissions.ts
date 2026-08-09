"use client";

import { useMemo } from "react";
import { useAuth } from "@/store/RoleContext";
import type { AdminPermissionName } from "@/types/admin";

const ADMIN_ACCESS_PERMS: AdminPermissionName[] = [
  "user.manage",
  "role.manage",
  "audit.view",
  "department.manage",
  "settings.manage",
  "catalog.manage",
  "ward.view",
  "ward.edit",
  "report.view",
];

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    const fromUser = (user as { permissions?: string[] } | null)?.permissions;
    return new Set((fromUser || []).map(String));
  }, [user]);

  const roles = useMemo(
    () => (user?.roles || []).map((r) => r.toLowerCase()),
    [user],
  );

  const isAdmin = roles.includes("admin");

  const can = (permission: string) => isAdmin || permissions.has(permission);

  const canAccessAdmin = isAdmin || ADMIN_ACCESS_PERMS.some((p) => permissions.has(p));

  return { permissions, roles, isAdmin, can, canAccessAdmin };
}
