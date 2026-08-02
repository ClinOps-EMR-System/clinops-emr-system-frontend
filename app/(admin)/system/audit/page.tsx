"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AuditLogEntry } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AuditPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [auditableType, setAuditableType] = useState("");
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAuditLogs(token, {
        search: search || undefined,
        action: action || undefined,
        auditable_type: auditableType || undefined,
        per_page: 50,
      });
      setLogs(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [token, search, action, auditableType]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Audit log</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Immutable record of administrative and auth actions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() =>
            void adminApi.exportAuditLogs(token, {
              ...(search ? { search } : {}),
              ...(action ? { action } : {}),
              ...(auditableType ? { auditable_type: auditableType } : {}),
            })
          }
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search actor, resource…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Input
          className="w-40"
          placeholder="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        />
        <Input
          className="w-44"
          placeholder="Resource type"
          value={auditableType}
          onChange={(e) => setAuditableType(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-[var(--outline)] bg-white">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit events"
            description="Staff and role changes will show up here once they happen."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user?.name || log.user?.email || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell className="text-sm">
                    {log.auditable_type}
                    {log.auditable_id ? ` #${log.auditable_id}` : ""}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(log)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit event"
        size="lg"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <p>
              <span className="font-medium">When:</span>{" "}
              {new Date(selected.created_at).toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Actor:</span>{" "}
              {selected.user?.name || selected.user?.email || "System"}
            </p>
            <p>
              <span className="font-medium">Action:</span> {selected.action}
            </p>
            <p>
              <span className="font-medium">Resource:</span>{" "}
              {selected.auditable_type} {selected.auditable_id}
            </p>
            <p>
              <span className="font-medium">IP:</span>{" "}
              {selected.ip_address || "—"}
            </p>
            <div>
              <p className="mb-1 font-medium">New values</p>
              <pre className="max-h-64 overflow-auto rounded-md bg-[var(--clinical-bg)] p-3 font-mono text-xs">
                {JSON.stringify(selected.new_values ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <p className="mb-1 font-medium">Old values</p>
              <pre className="max-h-64 overflow-auto rounded-md bg-[var(--clinical-bg)] p-3 font-mono text-xs">
                {JSON.stringify(selected.old_values ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
