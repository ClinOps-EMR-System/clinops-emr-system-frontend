"use client";

import { Clock, User, Activity, FileText, Pill, FlaskConical, HeartPulse, Stethoscope, AlertTriangle } from "lucide-react";
import type { AuditLogEntry } from "@/types/admin";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";

const EVENT_META: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  "patient.viewed":                { color: "text-slate-500", bg: "bg-slate-100", icon: <Activity className="h-3.5 w-3.5" />, label: "Record Accessed" },
  "patient.created":               { color: "text-emerald-600", bg: "bg-emerald-100", icon: <FileText className="h-3.5 w-3.5" />, label: "Patient Created" },
  "patient.updated":               { color: "text-amber-600", bg: "bg-amber-100", icon: <FileText className="h-3.5 w-3.5" />, label: "Record Updated" },
  "vital_signs.recorded":          { color: "text-rose-600", bg: "bg-rose-100", icon: <HeartPulse className="h-3.5 w-3.5" />, label: "Vitals Recorded" },
  "vital_signs.viewed":            { color: "text-slate-500", bg: "bg-slate-100", icon: <HeartPulse className="h-3.5 w-3.5" />, label: "Vitals Viewed" },
  "prescription.created":          { color: "text-blue-600", bg: "bg-blue-100", icon: <Pill className="h-3.5 w-3.5" />, label: "Prescription" },
  "prescription.dispensed":        { color: "text-indigo-600", bg: "bg-indigo-100", icon: <Pill className="h-3.5 w-3.5" />, label: "Dispensed" },
  "prescription.verified":         { color: "text-violet-600", bg: "bg-violet-100", icon: <Pill className="h-3.5 w-3.5" />, label: "Rx Verified" },
  "prescription.cancelled":        { color: "text-red-600", bg: "bg-red-100", icon: <Pill className="h-3.5 w-3.5" />, label: "Rx Cancelled" },
  "lab_result.created":            { color: "text-cyan-600", bg: "bg-cyan-100", icon: <FlaskConical className="h-3.5 w-3.5" />, label: "Lab Result" },
  "lab_result.released":           { color: "text-teal-600", bg: "bg-teal-100", icon: <FlaskConical className="h-3.5 w-3.5" />, label: "Lab Released" },
  "consultation.viewed":           { color: "text-slate-500", bg: "bg-slate-100", icon: <Stethoscope className="h-3.5 w-3.5" />, label: "Consultation Viewed" },
  "clinical_note.created":         { color: "text-purple-600", bg: "bg-purple-100", icon: <FileText className="h-3.5 w-3.5" />, label: "Clinical Note" },
  "clinical_note.signed_off":      { color: "text-green-600", bg: "bg-green-100", icon: <FileText className="h-3.5 w-3.5" />, label: "Note Signed Off" },
  "diagnosis.created":             { color: "text-orange-600", bg: "bg-orange-100", icon: <Stethoscope className="h-3.5 w-3.5" />, label: "Diagnosis Added" },
  "admission.created":             { color: "text-blue-700", bg: "bg-blue-100", icon: <FileText className="h-3.5 w-3.5" />, label: "Admission" },
  "admission.discharged":          { color: "text-green-700", bg: "bg-green-100", icon: <FileText className="h-3.5 w-3.5" />, label: "Discharged" },
  "allergy.recorded":              { color: "text-amber-700", bg: "bg-amber-100", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Allergy Recorded" },
};

const DEFAULT_META = { color: "text-gray-600", bg: "bg-gray-100", icon: <Activity className="h-3.5 w-3.5" />, label: "Event" };

function formatEventLabel(event: string): string {
  if (EVENT_META[event]) return EVENT_META[event].label;
  return event.split(".").map(s => s.replace(/_/g, " ")).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" — ");
}

function formatContextValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (key.includes("at") && key.includes("_")) {
      try { return new Date(value).toLocaleString(); } catch { return value; }
    }
    return value;
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface ClinicalTimelineProps {
  events: AuditLogEntry[];
  loading?: boolean;
  showPatient?: boolean;
}

export default function ClinicalTimeline({ events, loading, showPatient = false }: ClinicalTimelineProps) {
  if (loading) {
    return (
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
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="No activity recorded"
        description="Clinical events for this patient will appear here."
        icon={<Activity className="h-8 w-8" />}
      />
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-1">
        {events.map((event) => {
          const meta = EVENT_META[event.event ?? ""] ?? DEFAULT_META;
          const displayLabel = event.event ? formatEventLabel(event.event) : meta.label;

          const contextEntries = Object.entries(event.context ?? {}).filter(
            ([k]) => !["patient_id", "encounter_id"].includes(k) && event.context?.[k] != null,
          );

          return (
            <div key={event.id} className="relative flex gap-3 py-2 pl-1">
              <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bg} ${meta.color}`}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`text-sm font-medium ${meta.color}`}>
                      {displayLabel}
                    </span>
                    {event.event && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {event.event}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span title={new Date(event.created_at).toLocaleString()}>
                      {formatRelativeTime(event.created_at)}
                    </span>
                  </div>
                </div>

                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{event.user?.name || "System"}</span>
                </div>

                {showPatient && event.patient_id && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Patient #{event.patient_id}
                    {event.encounter_id ? ` · Encounter #${event.encounter_id}` : ""}
                  </div>
                )}

                {contextEntries.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {contextEntries.slice(0, 4).map(([k, v]) => (
                      <span key={k}>
                        <span className="font-medium">{k.replace(/_/g, " ")}:</span>{" "}
                        {formatContextValue(k, v)}
                      </span>
                    ))}
                    {contextEntries.length > 4 && (
                      <span className="text-muted-foreground/60">+{contextEntries.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
