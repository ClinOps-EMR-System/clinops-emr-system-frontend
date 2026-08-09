"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface QueuePatient {
  id?: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  priority: number | string;
  entered_queue_at: string;
}

interface EmergencyWaitingPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  arrived_at: string;
  wait_minutes: number;
}

type PriorityVariant = "error" | "warning" | "success";

function getWaitTime(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getWaitColor(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins > 30) return "text-red-600";
  if (mins > 10) return "text-amber-600";
  return "text-emerald-600";
}

function getPriorityLevel(priority: number | string): number {
  if (typeof priority === "string") {
    return priority === "high" ? 1 : priority === "medium" ? 3 : 5;
  }
  return priority;
}

function getPriorityVariant(priority: number | string): PriorityVariant {
  const p = getPriorityLevel(priority);
  if (p <= 2) return "error";
  if (p <= 3) return "warning";
  return "success";
}

function getPriorityLabel(priority: number | string): string {
  const p = getPriorityLevel(priority);
  if (p <= 2) return "HIGH";
  if (p <= 3) return "MED";
  return "LOW";
}

function SectionHeading({
  title,
  count,
  tone,
  href,
}: {
  title: string;
  count: number;
  tone: "red" | "amber";
  href: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <span
          className={cn(
            "size-1.5 rounded-full",
            tone === "red" ? "bg-red-500 animate-pulse" : "bg-amber-500"
          )}
        />
        <span className={cn("text-xs font-semibold uppercase tracking-wider", tone === "red" ? "text-red-700" : "text-amber-700")}>
          {title}
        </span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
            tone === "red" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
          )}
        >
          {count}
        </span>
      </h4>
      <Link
        href={href}
        className="text-xs font-semibold text-clinical-primary hover:text-clinical-primary-hover"
      >
        View all
      </Link>
    </div>
  );
}

export function QueuePreview({ queue, emergencyWaiting }: { queue: QueuePatient[]; emergencyWaiting?: EmergencyWaitingPatient[] }) {
  const hasEmergencyWaiting = emergencyWaiting && emergencyWaiting.length > 0;
  const hasQueue = queue && queue.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!hasEmergencyWaiting && !hasQueue && (
          <p className="text-sm text-muted-foreground">No patients waiting right now.</p>
        )}

        {hasEmergencyWaiting && (
          <section className="flex flex-col gap-2">
            <SectionHeading title="Awaiting Triage" count={emergencyWaiting.length} tone="red" href="/triage-queue" />
            <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-foreground/10">
              {emergencyWaiting.slice(0, 3).map((patient) => (
                <div
                  key={patient.patient_id}
                  className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                      ER
                    </span>
                    <div className="min-w-0">
                      <Link
                        href={`/patients/${patient.patient_id}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-clinical-primary"
                      >
                        {patient.full_name}
                      </Link>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {patient.hospital_number}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs font-semibold",
                      patient.wait_minutes > 10 ? "text-red-600" : "text-emerald-600"
                    )}
                  >
                    {patient.wait_minutes}m
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {hasQueue && (
          <section className="flex flex-col gap-2">
            <SectionHeading title="Awaiting Doctor" count={queue.length} tone="amber" href="/queue" />
            <div className="flex flex-col overflow-hidden rounded-lg ring-1 ring-foreground/10">
              {queue.slice(0, 5).map((entry, idx) => (
                <div
                  key={entry.id ?? entry.patient?.id ?? idx}
                  className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5 last:border-b-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusBadge label={getPriorityLabel(entry.priority)} variant={getPriorityVariant(entry.priority)} className="shrink-0" />
                    <div className="min-w-0">
                      <Link
                        href={`/patients/${entry.patient.id}`}
                        className="block truncate text-sm font-medium text-foreground hover:text-clinical-primary"
                      >
                        {entry.patient.first_name} {entry.patient.last_name}
                      </Link>
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {entry.patient.hospital_number}
                      </p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 font-mono text-xs font-semibold", getWaitColor(entry.entered_queue_at))}>
                    {getWaitTime(entry.entered_queue_at)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
