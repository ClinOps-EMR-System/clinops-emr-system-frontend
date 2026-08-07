"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X, Stethoscope, Users, AlertTriangle, Clock } from "lucide-react";

import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
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

interface EmergencyPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  arrived_at: string;
  wait_minutes: number;
  severity_level: number;
}

interface CheckedInAppointment {
  id: number;
  patient_id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  encounter_id?: number;
  encounter?: {
    id: number;
    status: string;
  };
  scheduled_for: string;
  reason: string | null;
}

interface TriageEntry {
  id: string;
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  wait_minutes: number;
  priority: number;
  source: "emergency" | "appointment";
}

interface DashboardData {
  encounters: {
    awaiting_triage: number;
    in_consultation: number;
    discharged_today: number;
  };
}

interface ResuscitationPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  severity_level: number;
  chief_complaint: string;
  triaged_at: string;
  wait_minutes: number;
}

type SourceFilter = "all" | "emergency" | "appointment";
type PriorityFilter = "all" | "critical" | "high" | "medium" | "low";

const sourceOptions = [
  { value: "all", label: "All Sources" },
  { value: "emergency", label: "Emergency" },
  { value: "appointment", label: "Appointment" },
];

const priorityOptions = [
  { value: "all", label: "All Priorities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-muted-foreground";
}

function formatWaitTime(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

function getPriorityBadge(priority: number) {
  if (priority <= 2) return { label: priority === 1 ? "Critical" : "Urgent", variant: "error" as const, pulse: priority === 1 };
  if (priority === 3) return { label: "High", variant: "warning" as const };
  if (priority === 4) return { label: "Medium", variant: "success" as const };
  return { label: "Low", variant: "success" as const };
}

function getSourceBadge(source: "emergency" | "appointment") {
  if (source === "emergency") return { label: "ER", variant: "error" as const, pulse: true };
  return { label: "Appt", variant: "info" as const };
}

function matchesPriorityFilter(priority: number, filter: PriorityFilter): boolean {
  if (filter === "all") return true;
  if (filter === "critical") return priority <= 2;
  if (filter === "high") return priority === 3;
  if (filter === "medium") return priority === 4;
  return priority === 5;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrap = (val: any): any[] => (Array.isArray(val) ? val : val?.data) ?? [];

export default function NurseStationPage() {
  const { user } = useAuth();
  const { data: dashboard } = useFetch<DashboardData>("/dashboard", { interval: 30000 });
  const { data: resuscitationData } = useFetch<ResuscitationPatient[]>("/emergency/resuscitation", { interval: 15000 });
  const { data: emergencyRaw, loading: emergLoading } = useFetch<EmergencyPatient[]>("/emergency/waiting", { interval: 20000 });
  const [now] = useState(() => Date.now());
  const todayStr = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  const { data: appointmentsRaw, loading: apptLoading } = useFetch<CheckedInAppointment[]>(
    `/appointments?date=${todayStr}&status=Checked-in`, { interval: 20000 }
  );

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const loading = emergLoading || apptLoading;
  const resuscitationPatients = unwrap(resuscitationData);

  const entries: TriageEntry[] = useMemo(() => {
    const result: TriageEntry[] = [];

    const emergencyPatients = unwrap(emergencyRaw);
    for (const ep of emergencyPatients) {
      const waitMinutes = ep.wait_minutes ?? Math.round((now - new Date(ep.arrived_at).getTime()) / 60000);
      result.push({
        id: `emergency-${ep.patient_id}`,
        patient_id: ep.patient_id,
        hospital_number: ep.hospital_number,
        full_name: ep.full_name,
        chief_complaint: ep.chief_complaint || "",
        wait_minutes: waitMinutes,
        priority: ep.severity_level || 3,
        source: "emergency",
      });
    }

    if (appointmentsRaw) {
      for (const ap of appointmentsRaw) {
        if (ap.encounter && !["awaiting_triage", "being_triaged"].includes(ap.encounter.status)) {
          continue;
        }
        const waitMinutes = Math.round((now - new Date(ap.scheduled_for).getTime()) / 60000);
        result.push({
          id: `appt-${ap.id}`,
          patient_id: ap.patient.id,
          hospital_number: ap.patient.hospital_number,
          full_name: `${ap.patient.first_name} ${ap.patient.last_name}`,
          chief_complaint: ap.reason || "",
          wait_minutes: Math.max(0, waitMinutes),
          priority: 3,
          source: "appointment",
        });
      }
    }

    return result;
  }, [emergencyRaw, appointmentsRaw, now]);

  const hasFilters = search !== "" || sourceFilter !== "all" || priorityFilter !== "all";

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.hospital_number.toLowerCase().includes(q)
      );
    }

    if (sourceFilter !== "all") {
      result = result.filter((e) => e.source === sourceFilter);
    }

    if (priorityFilter !== "all") {
      result = result.filter((e) => matchesPriorityFilter(e.priority, priorityFilter));
    }

    result.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.wait_minutes - a.wait_minutes;
    });

    return result;
  }, [entries, search, sourceFilter, priorityFilter]);

  const clearFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setPriorityFilter("all");
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <SectionHeader
        title={`${greeting()}, ${user?.name?.split(" ")[0] || "Nurse"}`}
        description="Your clinical workspace — patients waiting for triage"
      />

      {/* Resuscitation Alert Banner */}
      {resuscitationPatients.length > 0 && (
        <section className="bg-red-600 text-white rounded-lg p-4 animate-pulse">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-lg font-extrabold uppercase tracking-wider">
              Resuscitation Alert — {resuscitationPatients.length} Patient{resuscitationPatients.length !== 1 ? "s" : ""}
            </h2>
          </div>
          <div className="space-y-2">
            {resuscitationPatients.map((p) => (
              <div key={p.patient_id} className="flex items-center justify-between bg-red-700/50 rounded px-3 py-2">
                <div className="flex items-center gap-3">
                  <Link href={`/patients/${p.patient_id}`} className="text-sm font-bold hover:underline">
                    {p.full_name}
                  </Link>
                  <span className="text-xs font-mono opacity-75">{p.hospital_number}</span>
                  {p.chief_complaint && (
                    <span className="text-xs opacity-75 hidden sm:inline">— {p.chief_complaint}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge label={`Lvl ${p.severity_level}`} variant="error" pulse />
                  <span className="text-xs font-mono">{p.wait_minutes}m</span>
                  <Link
                    href={`/patients/${p.patient_id}/emergency-triage`}
                    className="text-xs font-bold bg-white text-red-700 px-3 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    Triage Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/triage-queue" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Waiting for Triage
              </CardTitle>
              <Stethoscope className="size-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-16" /> : entries.length}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/triage-queue" className="block">
          <Card className={cn(
            "transition-all hover:shadow-sm",
            (dashboard?.encounters?.awaiting_triage ?? 0) > 0 && "ring-1 ring-amber-500/20"
          )}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Awaiting Triage
              </CardTitle>
              <Clock className={cn(
                "size-4",
                (dashboard?.encounters?.awaiting_triage ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground/60"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight",
                (dashboard?.encounters?.awaiting_triage ?? 0) > 0 ? "text-amber-600" : "text-foreground"
              )}>
                {loading ? <Skeleton className="h-8 w-16" /> : dashboard?.encounters?.awaiting_triage ?? "\u2014"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/consultation-queue" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                In Consultation
              </CardTitle>
              <Users className={cn(
                "size-4",
                (dashboard?.encounters?.in_consultation ?? 0) > 0 ? "text-blue-500" : "text-muted-foreground/60"
              )} />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight",
                (dashboard?.encounters?.in_consultation ?? 0) > 0 ? "text-blue-600" : "text-foreground"
              )}>
                {loading ? <Skeleton className="h-8 w-16" /> : dashboard?.encounters?.in_consultation ?? "\u2014"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admissions" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Discharged Today
              </CardTitle>
              <Users className="size-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {loading ? <Skeleton className="h-8 w-16" /> : dashboard?.encounters?.discharged_today ?? "\u2014"}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

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
                label="Source"
                options={sourceOptions}
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
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
            Patients Waiting for Triage
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-(--card-spacing) py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-28 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={entries.length === 0 ? <Users className="h-6 w-6 text-gray-400" /> : <Search className="h-6 w-6 text-gray-400" />}
                title={entries.length === 0 ? "No patients waiting" : "No patients match your filters"}
                description={
                  entries.length === 0
                    ? "All patients have been triaged. Check with reception for new arrivals."
                    : "Try adjusting your search or filter criteria."
                }
                action={
                  entries.length === 0 ? (
                    <Link href="/triage-queue" className="inline-flex items-center px-4 py-2 bg-clinical-primary text-white text-sm font-bold rounded hover:bg-clinical-primary-hover transition-colors">
                      View Queue
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patient</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Chief Complaint</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wait Time</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const priorityBadge = getPriorityBadge(entry.priority);
                    const sourceBadge = getSourceBadge(entry.source);
                    const waitMinutes = entry.wait_minutes;

                    return (
                      <TableRow
                        key={entry.id}
                        className={cn(entry.source === "emergency" && "bg-red-50/60 dark:bg-red-950/20")}
                      >
                        <TableCell>
                          <Link
                            href={`/patients/${entry.patient_id}`}
                            className="font-medium text-foreground hover:text-clinical-primary hover:underline"
                          >
                            {entry.full_name}
                          </Link>
                          <div className="text-xs text-muted-foreground font-mono">
                            {entry.hospital_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={sourceBadge.label}
                            variant={sourceBadge.variant}
                            pulse={sourceBadge.pulse}
                          />
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            label={priorityBadge.label}
                            variant={priorityBadge.variant}
                            pulse={priorityBadge.pulse}
                          />
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {entry.chief_complaint || "\u2014"}
                        </TableCell>
                        <TableCell>
                          <span className={cn("tabular-nums font-medium text-sm flex items-center gap-1", getWaitColor(waitMinutes))}>
                            <Clock className="h-3.5 w-3.5" />
                            {formatWaitTime(waitMinutes)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {entry.source === "emergency" ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              render={
                                <Link href={`/patients/${entry.patient_id}/emergency-triage`} />
                              }
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Rapid Triage
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              render={
                                <Link href={`/patients/${entry.patient_id}/triage`} />
                              }
                            >
                              <Stethoscope className="h-4 w-4 mr-1" />
                              Start Triage
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
