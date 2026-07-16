export const usePermission = () => {

  const hasPermission = (permission: string) => {

  };

  const can = (permission: string) => {
    return hasPermission(permission);
  };

  const hasAllPermissions = (permissions: string[]) => {
    return permissions.every(permission => hasPermission(permission));
  };

  const hasAnyPermission = (permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  };

  const hasAnyOfPermissions = (permissions: string[]) => {
    return hasAnyPermission(permissions);
  };

  const hasAllOfPermissions = (permissions: string[]) => {
    return hasAllPermissions(permissions);
  };


  return {
    hasPermission,
    can,
    hasAnyOfPermissions,
    hasAllOfPermissions,
  };
};
