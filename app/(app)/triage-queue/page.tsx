"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, Stethoscope, Users, AlertTriangle, Clock } from "lucide-react";

import { useFetch } from "@/lib/useFetch";
import { cn } from "@/lib/utils";

import { SectionHeader } from "@/components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SelectField from "@/components/ui/SelectField";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";

interface TriageWorklistEntry {
  encounter_id: number;
  encounter_type: string;
  source: "emergency" | "appointment" | "walk-in";
  patient: {
    id: number;
    hospital_number: string;
    full_name: string;
  };
  status: string;
  chief_complaint: string | null;
  triage_priority: number | null;
  arrived_at: string;
  wait_time_minutes: number;
}

interface TriageEntry {
  id: string;
  patient_id: number;
  encounter_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  wait_minutes: number;
  priority: number;
  source: "emergency" | "appointment" | "walk-in";
}

type SourceFilter = "all" | "emergency" | "appointment" | "walk-in";
type PriorityFilter = "all" | "critical" | "high" | "medium" | "low";

const sourceOptions = [
  { value: "all", label: "All Sources" },
  { value: "emergency", label: "Emergency" },
  { value: "appointment", label: "Appointment" },
  { value: "walk-in", label: "Walk-in" },
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
  const whole = Math.floor(minutes);
  if (whole >= 60) {
    const h = Math.floor(whole / 60);
    const m = whole % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${whole}m`;
}

function getPriorityBadge(priority: number) {
  if (priority === 1) return { label: "L1 Immediate", variant: "error" as const, pulse: true };
  if (priority === 2) return { label: "L2 Very Urgent", variant: "error" as const };
  if (priority === 3) return { label: "L3 Urgent", variant: "warning" as const };
  if (priority === 4) return { label: "L4 Standard", variant: "success" as const };
  return { label: "L5 Non-Urgent", variant: "info" as const };
}

function getSourceBadge(source: TriageEntry["source"]) {
  if (source === "emergency") return { label: "ER", variant: "error" as const, pulse: true };
  if (source === "appointment") return { label: "Appt", variant: "info" as const };
  return { label: "Walk-in", variant: "warning" as const };
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

export default function TriageQueuePage() {
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");

  const { data: worklistRaw, loading } = useFetch<TriageWorklistEntry[]>(
    "/worklist/triage", { interval: 20000 }
  );

  const entries: TriageEntry[] = useMemo(() => {
    return unwrap(worklistRaw).map((entry) => ({
      id: `encounter-${entry.encounter_id}`,
      patient_id: entry.patient.id,
      encounter_id: entry.encounter_id,
      hospital_number: entry.patient.hospital_number,
      full_name: entry.patient.full_name,
      chief_complaint: entry.chief_complaint || "",
      wait_minutes: entry.wait_time_minutes,
      priority: entry.triage_priority ?? (entry.source === "emergency" ? 2 : 4),
      source: entry.source,
    }));
  }, [worklistRaw]);

  const hasFilters = search !== "" || sourceFilter !== "all" || priorityFilter !== "all";

  const filteredEntries = useMemo(() => {
    let result = [...entries];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.hospital_number.toLowerCase().includes(q)
      );
    }

    // Source filter
    if (sourceFilter !== "all") {
      result = result.filter((e) => e.source === sourceFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      result = result.filter((e) => matchesPriorityFilter(e.priority, priorityFilter));
    }

    // Sort: priority ascending, then wait time descending
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

  const emergencyCount = entries.filter((e) => e.source === "emergency").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <SectionHeader
        title="Triage Queue"
        description="Patients waiting for triage, sorted by clinical urgency"
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

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm font-mono flex-wrap">
        <span className="text-muted-foreground">
          {entries.length} patient{entries.length !== 1 ? "s" : ""} waiting
        </span>
        {emergencyCount > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {emergencyCount} emergency
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Waiting List
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
                      <TableCell><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={entries.length === 0 ? <Users className="h-6 w-6 text-gray-400" /> : <Search className="h-6 w-6 text-gray-400" />}
                title={entries.length === 0 ? "No patients waiting for triage" : "No patients match your filters"}
                description={
                  entries.length === 0
                    ? "Check reception for new arrivals or register a new patient."
                    : "Try adjusting your search or filter criteria."
                }
                action={
                  entries.length === 0 ? (
                    <Link href="/patients/register" className="inline-flex items-center px-4 py-2 bg-clinical-primary text-white text-sm font-bold rounded hover:bg-clinical-primary-hover transition-colors">
                      Register Patient
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
                      <TableRow key={entry.id}>
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
                          <Button
                            size="sm"
                            variant={entry.source === "emergency" ? "destructive" : "default"}
                            render={
                              <Link
                                href={
                                  entry.source === "emergency"
                                    ? `/patients/${entry.patient_id}/emergency-triage`
                                    : `/patients/${entry.patient_id}/triage`
                                }
                              />
                            }
                          >
                            <Stethoscope className="h-4 w-4 mr-1" />
                            {entry.source === "emergency" ? "Rapid Triage" : "Start Triage"}
                          </Button>
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
