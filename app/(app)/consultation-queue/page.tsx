"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Stethoscope, Users } from "lucide-react";

import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import { cn } from "../../../lib/utils";

import { SectionHeader } from "../../../components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Skeleton } from "../../../components/ui/skeleton";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import SelectField from "../../../components/ui/SelectField";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";

interface QueueEntry {
  id: number;
  patient_id: number;
  encounter_id: number;
  assigned_to: number | null;
  priority: number;
  position: number;
  patient: {
    hospital_number: string;
    full_name: string;
  };
  assigned_to_user: {
    id: number;
    name: string;
    email: string;
  } | null;
  entered_queue_at: string;
  encounter_status: string;
  chief_complaint: string;
}

interface QueueData {
  entries: QueueEntry[];
  meta: {
    waiting_count: number;
    by_priority: Record<string, number>;
    oldest_wait_time: number;
  };
}

type StatusFilter = "all" | "waiting" | "in_consultation";
type PriorityFilter = "all" | "critical" | "high" | "medium" | "low";

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "waiting", label: "Waiting" },
  { value: "in_consultation", label: "In Consultation" },
];

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function getWaitMinutes(enteredAt: string): number {
  return Math.round((Date.now() - new Date(enteredAt).getTime()) / 60000);
}

function formatWaitTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-muted-foreground";
}

function getEncounterStatus(encounterStatus: string): "waiting" | "in_consultation" {
  if (encounterStatus === "In Consultation" || encounterStatus === "in_consultation") return "in_consultation";
  return "waiting";
}

function getStatusBadge(status: "waiting" | "in_consultation") {
  if (status === "in_consultation") {
    return { label: "In Consultation", variant: "purple" as const, pulse: true };
  }
  return { label: "Waiting", variant: "info" as const };
}

function getPriorityBadge(priority: number) {
  if (priority <= 2) return { label: priority === 1 ? "Critical" : "Urgent", variant: "error" as const, pulse: priority === 1 };
  if (priority === 3) return { label: "High", variant: "warning" as const };
  if (priority === 4) return { label: "Medium", variant: "success" as const };
  return { label: "Low", variant: "success" as const };
}

function matchesPriorityFilter(priority: number, filter: PriorityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "critical") return priority <= 2;
  if (filter === "high") return priority === 3;
  if (filter === "medium") return priority === 4;
  return priority === 5;
}

export default function ConsultationQueuePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: queueRaw, loading, error } = useFetch<QueueData>("/queue", { interval: 20000 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [startingId, setStartingId] = useState<number | null>(null);
  const [clinicians, setClinicians] = useState<{ id: number; name: string }[]>([]);
  const [assigningId, setAssigningId] = useState<number | null>(null);

  const fetchClinicians = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/users?per_page=100", token);
      const data = res.data?.data?.data ?? res.data?.data ?? [];
      const filtered = Array.isArray(data)
        ? data.filter((u: { roles?: { name: string }[] }) =>
            u.roles?.some((r: { name: string }) =>
              ["Doctor", "Clinical Officer"].includes(r.name)
            )
          )
        : [];
      setClinicians(filtered.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name })));
    } catch {
      // silent
    }
  }, [token]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void fetchClinicians();
  }, [fetchClinicians]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const entries = useMemo(() => queueRaw?.entries || [], [queueRaw]);
  const hasFilters = search !== "" || statusFilter !== "all" || priorityFilter !== "all";

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.patient.full_name.toLowerCase().includes(q) ||
          e.patient.hospital_number.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((e) => getEncounterStatus(e.encounter_status) === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((e) => matchesPriorityFilter(e.priority, priorityFilter));
    }

    // Sort: priority ascending, then wait time descending
    result.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return getWaitMinutes(b.entered_queue_at) - getWaitMinutes(a.entered_queue_at);
    });

    return result;
  }, [entries, search, statusFilter, priorityFilter]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
  };

  const handleStartConsultation = async (entry: QueueEntry) => {
    if (!token || startingId) return;
    setStartingId(entry.id);
    try {
      await api.post(`/queue/${entry.id}/start`, {}, token);
      router.push(`/patients/${entry.patient_id}`);
    } catch {
      setStartingId(null);
    }
  };

  const handleAssign = async (entryId: number, clinicianId: string) => {
    if (!token) return;
    setAssigningId(entryId);
    try {
      if (clinicianId) {
        await api.post(`/queue/${entryId}/assign`, { assigned_to: Number(clinicianId) }, token);
      } else {
        await api.delete(`/queue/${entryId}/assign`, token);
      }
    } catch {
      // silent
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <SectionHeader
        title="Consultation Queue"
        description="Patients triaged and ready for clinical consultation"
      />

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name or hospital number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <SelectField
                label="Status"
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              />
            </div>

            <div className="min-w-[160px]">
              <SelectField
                label="Priority"
                options={priorityOptions}
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
              />
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive/80 h-9 mt-5"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Queue Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-(--card-spacing) py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chief Complaint</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wait Time</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20 mt-1" />
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-28 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : error ? (
            <div className="px-(--card-spacing) py-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={entries.length === 0 ? <Users className="h-6 w-6 text-gray-500" /> : <Search className="h-6 w-6 text-gray-500" />}
                title={entries.length === 0 ? "No patients in queue" : "No patients match your filters"}
                description={
                  entries.length === 0
                    ? "There are currently no patients waiting for consultation."
                    : "Try adjusting your search or filter criteria."
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assigned To</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chief Complaint</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wait Time</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const encounterStatus = getEncounterStatus(entry.encounter_status);
                    const statusBadge = getStatusBadge(encounterStatus);
                    const priorityBadge = getPriorityBadge(entry.priority);
                    const waitMinutes = getWaitMinutes(entry.entered_queue_at);
                    const isStarting = startingId === entry.id;

                    return (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <Link
                            href={`/patients/${entry.patient_id}`}
                            className="font-medium text-foreground hover:text-clinical-primary hover:underline"
                          >
                            {entry.patient.full_name}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">
                            {entry.patient.hospital_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={statusBadge.label}
                            variant={statusBadge.variant}
                            pulse={statusBadge.pulse}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={priorityBadge.label}
                            variant={priorityBadge.variant}
                            pulse={priorityBadge.pulse}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            className="h-8 rounded-md border border-input bg-white px-2 text-xs"
                            value={entry.assigned_to ?? ""}
                            onChange={(e) => void handleAssign(entry.id, e.target.value)}
                            disabled={assigningId === entry.id}
                          >
                            <option value="">Unassigned</option>
                            {clinicians.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {entry.chief_complaint || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("tabular-nums font-medium text-sm", getWaitColor(waitMinutes))}>
                            {formatWaitTime(waitMinutes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {encounterStatus === "waiting" ? (
                            <Button
                              size="sm"
                              onClick={() => handleStartConsultation(entry)}
                              disabled={isStarting}
                            >
                              <Stethoscope className="h-4 w-4 mr-1" />
                              {isStarting ? "Starting..." : "Start Consultation"}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/patients/${entry.patient_id}`)}
                            >
                              <Stethoscope className="h-4 w-4 mr-1" />
                              Continue
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="px-(--card-spacing) py-3 border-t text-xs text-muted-foreground font-mono">
                Showing {filteredEntries.length} of {entries.length} patients
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
