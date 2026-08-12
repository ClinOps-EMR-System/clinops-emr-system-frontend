"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { adminApi } from "@/lib/services/admin";
import type { AdminOverview } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SystemOverviewPage() {
  const { token } = useAuth();
  const { can } = usePermissions();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminApi.overview(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Staff access, recent changes, and hospital structure at a glance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("report.view") && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void adminApi.exportStaffRoster(token)}
              >
                Export staff roster
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void adminApi.exportAuditSummary(token)}
              >
                Export audit summary
              </Button>
            </>
          )}
          {can("user.manage") && (
            <Button size="sm" nativeButton={false} render={<Link href="/system/staff" />}>
              Manage staff
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-[var(--color-clinical-error)]/30 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["Active staff", data?.staff_active],
            ["Inactive staff", data?.staff_inactive],
            ["Audit (24h)", data?.audit_last_24h],
            ["Departments", data?.departments_count],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[var(--outline)] bg-white px-4 py-3"
          >
            <p className="text-xs font-medium text-[var(--clinical-muted)]">
              {label}
            </p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {value ?? "—"}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-[var(--outline)] bg-white">
          <div className="border-b border-[var(--outline)] px-4 py-3">
            <h2 className="text-sm font-semibold">Staff by role</h2>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.staff_by_role || []).map((row) => (
                    <TableRow key={row.role}>
                      <TableCell>{row.role}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.count}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--outline)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--outline)] px-4 py-3">
            <h2 className="text-sm font-semibold">Recent audit activity</h2>
            {can("audit.view") && (
              <Link
                href="/system/audit"
                className="text-xs font-medium text-[var(--clinical-primary)]"
              >
                View all
              </Link>
            )}
          </div>
          <ul className="divide-y divide-[var(--outline)]">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-3/4" />
                </li>
              ))}
            {!loading &&
              (data?.recent_audit || []).map((entry) => (
                <li key={entry.id} className="px-4 py-3 text-sm">
                  <p className="font-medium">
                    {entry.action} · {entry.auditable_type}
                    {entry.auditable_id ? ` #${entry.auditable_id}` : ""}
                  </p>
                  <p className="text-xs text-[var(--clinical-muted)]">
                    {entry.user?.name || entry.user?.email || "System"} ·{" "}
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </li>
              ))}
            {!loading && (data?.recent_audit || []).length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-[var(--clinical-muted)]">
                No audit events yet. Changes to staff and roles will appear here.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
