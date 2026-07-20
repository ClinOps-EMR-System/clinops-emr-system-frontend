import { useAuth } from "@/store/RoleContext";
import { useEffect } from "react";

export const usePermission = () => {
  const { user } = useAuth();

  useEffect(() => {
    console.log(user)
  }, [user])

  const permissions = user?.permissions ?? [];

  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  const can = (permission: string) => {
    return hasPermission(permission);
  };

  const hasAllPermissions = (perms: string[]) => {
    return perms.every((p) => hasPermission(p));
  };

  const hasAnyPermission = (perms: string[]) => {
    return perms.some((p) => hasPermission(p));
  };

  return {
    hasPermission,
    can,
    hasAllPermissions,
    hasAnyPermission,
  };
};
