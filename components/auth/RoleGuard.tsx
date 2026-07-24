"use client";

import { useAuth } from "@/store/RoleContext";
import { useRouter } from "next/navigation";
import { type ReactNode } from "react";

interface RoleGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();
  const router = useRouter();

  const userRoles = (user?.roles || []).map((r) => r.toLowerCase());
  const dept = (user?.department?.name || "").toLowerCase();

  // Derive role from roles OR department name
  const derivedRoles = [
    ...userRoles,
    ...(dept.includes("registration") || dept.includes("reception") ? ["receptionist"] : []),
    ...(dept.includes("pharm") ? ["pharmacist"] : []),
    ...(dept.includes("lab") ? ["lab technician"] : []),
    ...(dept.includes("bill") || dept.includes("finance") ? ["billing officer"] : []),
  ];

  const hasAccess = derivedRoles.some((r) => allowedRoles.includes(r)) || derivedRoles.includes("admin");

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
        <p className="text-gray-500">You don&apos;t have permission to view this page.</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm font-bold text-clinical-primary hover:text-clinical-primary-hover underline"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
