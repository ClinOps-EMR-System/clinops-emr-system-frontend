"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Search, Activity, ScrollText } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AuditLogEntry } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ClinicalTimeline from "@/components/audit/ClinicalTimeline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

const EVENT_CATEGORIES = [
  { value: "", label: "All events" },
  { value: "patient.*", label: "Patient" },
  { value: "vital_signs.*", label: "Vital Signs" },
  { value: "prescription.*", label: "Prescription" },
  { value: "lab_result.*", label: "Lab Result" },
  { value: "clinical_note.*", label: "Clinical Notes" },
  { value: "diagnosis.*", label: "Diagnosis" },
  { value: "admission.*", label: "Admission" },
  { value: "consultation.*", label: "Consultation" },
  { value: "order.*", label: "Orders" },
  { value: "allergy.*", label: "Allergy" },
  { value: "auth.*", label: "Auth" },
  { value: "queue.*", label: "Queue" },
];

const EVENT_BADGE_COLORS: Record<string, string> = {
  "patient": "bg-slate-100 text-slate-700",
  "vital_signs": "bg-rose-100 text-rose-700",
  "prescription": "bg-blue-100 text-blue-700",
  "lab_result": "bg-cyan-100 text-cyan-700",
  "clinical_note": "bg-purple-100 text-purple-700",
  "diagnosis": "bg-orange-100 text-orange-700",
  "admission": "bg-indigo-100 text-indigo-700",
  "consultation": "bg-teal-100 text-teal-700",
  "order": "bg-amber-100 text-amber-700",
  "allergy": "bg-yellow-100 text-yellow-700",
  "auth": "bg-gray-100 text-gray-700",
  "queue": "bg-emerald-100 text-emerald-700",
};

function getEventBadgeClass(event: string | null | undefined): string {
  if (!event) return "bg-gray-100 text-gray-700";
  const category = event.split(".")[0];
  return EVENT_BADGE_COLORS[category] ?? "bg-gray-100 text-gray-700";
}

export default function AuditPage() {
  usePageTitle("Audit Log");
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [auditableType, setAuditableType] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [patientFilter, setPatientFilter] = useState("");
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAuditLogs(token, {
        search: search || undefined,
        action: action || undefined,
        auditable_type: auditableType || undefined,
        event: eventFilter || undefined,
        patient_id: patientFilter || undefined,
        per_page: 50,
      });
      setLogs(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [token, search, action, auditableType, eventFilter, patientFilter]);

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
            Immutable record of clinical and administrative actions.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-md border border-input bg-white">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <ScrollText className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md ${
                viewMode === "timeline" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Timeline
            </button>
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
                ...(eventFilter ? { event: eventFilter } : {}),
                ...(patientFilter ? { patient_id: patientFilter } : {}),
              })
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
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
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
        >
          {EVENT_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
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
        <Input
          className="w-36"
          placeholder="Patient ID"
          type="number"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}

      {viewMode === "timeline" ? (
        <div className="rounded-lg border border-[var(--outline)] bg-white p-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ClinicalTimeline events={logs} />
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--outline)] bg-white">
          {loading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <EmptyState
              title="No audit events"
              description="Staff and clinical events will show up here once they happen."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Event</TableHead>
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
                    <TableCell>
                      {log.event ? (
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getEventBadgeClass(log.event)}`}>
                          {log.event}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
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
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Audit event"
        size="lg"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">When:</span>{" "}
              {new Date(selected.created_at).toLocaleString()}
            </div>
            <p>
              <span className="font-medium">Actor:</span>{" "}
              {selected.user?.name || selected.user?.email || "System"}
            </p>
            {selected.event && (
              <p>
                <span className="font-medium">Event:</span>{" "}
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${getEventBadgeClass(selected.event)}`}>
                  {selected.event}
                </span>
              </p>
            )}
            <p>
              <span className="font-medium">Action:</span> {selected.action}
            </p>
            <p>
              <span className="font-medium">Resource:</span>{" "}
              {selected.auditable_type} {selected.auditable_id}
            </p>
            {selected.patient_id && (
              <p>
                <span className="font-medium">Patient ID:</span>{" "}
                {selected.patient_id}
              </p>
            )}
            {selected.encounter_id && (
              <p>
                <span className="font-medium">Encounter ID:</span>{" "}
                {selected.encounter_id}
              </p>
            )}
            <p>
              <span className="font-medium">IP:</span>{" "}
              {selected.ip_address || "—"}
            </p>
            {selected.context && Object.keys(selected.context).length > 0 && (
              <div>
                <p className="mb-1 font-medium">Context</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-[var(--clinical-bg)] p-3 font-mono text-xs">
                  {JSON.stringify(selected.context, null, 2)}
                </pre>
              </div>
            )}
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
