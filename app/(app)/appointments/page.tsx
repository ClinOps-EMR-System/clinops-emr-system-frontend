"use client";

import { useState, useCallback, useEffect } from "react";
import { useFetch } from "@/lib/useFetch";
import { AppointmentActions } from "@/components/appointments/AppointmentActions";
import { NewAppointmentModal } from "@/components/appointments/NewAppointmentModal";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface Appointment {
  id: number;
  patient_id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  provider?: { name: string } | null;
  appointment_type: string;
  status: string;
  scheduled_for: string;
  reason: string | null;
}

type StatusFilter = "all" | "confirmed" | "arrived" | "completed" | "cancelled" | "no_show";

const FILTER_TABS: Array<[StatusFilter, string]> = [
  ["all", "All"],
  ["confirmed", "Confirmed"],
  ["arrived", "Arrived"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["no_show", "No-show"],
];

const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "appointments",
  confirmed: "confirmed",
  arrived: "arrived",
  completed: "completed",
  cancelled: "cancelled",
  no_show: "no-show",
};

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
  const s = status?.toLowerCase();
  if (s === "checked-in" || s === "arrived") return "success";
  if (s === "confirmed" || s === "scheduled") return "info";
  if (s === "completed") return "success";
  if (s === "cancelled" || s === "no-show" || s === "no_show") return "error";
  return "neutral";
}

export default function AppointmentsPage() {
  usePageTitle("Appointments");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  useEffect(() => {
    if (window.location.search.includes("new=true")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowNewAppointment(true);
    }
  }, []);

  const [today] = useState(() => {
    // Use local date string (YYYY-MM-DD) without UTC conversion tricks
    return new Date().toLocaleDateString("en-CA");
  });
  const { data, loading, refetch } = useFetch<Appointment[]>(
    `/appointments?date=${today}`,
    { interval: 30000 }
  );

  const appointments = data ?? [];

  const filtered = statusFilter === "all"
    ? appointments
    : appointments.filter((a) => {
        const s = a.status?.toLowerCase();
        if (statusFilter === "confirmed") return ["confirmed", "scheduled"].includes(s);
        if (statusFilter === "arrived") return ["checked-in", "arrived"].includes(s);
        if (statusFilter === "no_show") return ["no-show", "no_show"].includes(s);
        return s === statusFilter;
      });

  const counts = {
    all: appointments.length,
    confirmed: appointments.filter((a) => ["confirmed", "scheduled"].includes(a.status?.toLowerCase())).length,
    arrived: appointments.filter((a) => ["checked-in", "arrived"].includes(a.status?.toLowerCase())).length,
    completed: appointments.filter((a) => a.status?.toLowerCase() === "completed").length,
    cancelled: appointments.filter((a) => a.status?.toLowerCase() === "cancelled").length,
    no_show: appointments.filter((a) => ["no-show", "no_show"].includes(a.status?.toLowerCase())).length,
  };

  const handleAction = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Scheduling
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Appointments
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-MW", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button onClick={() => setShowNewAppointment(true)}>
          <Plus data-icon="inline-start" />
          New Appointment
        </Button>
      </div>

      {/* Status Tabs */}
      <section
        role="tablist"
        aria-label="Appointment status filter"
        className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {FILTER_TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              "flex-shrink-0 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all",
              statusFilter === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </section>

      {/* Appointments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-(--card-spacing) py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-(--card-spacing) py-12 text-center text-sm text-muted-foreground">
              No {FILTER_LABELS[statusFilter]} scheduled for today.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden lg:table-cell">Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(appt.scheduled_for).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {appt.patient.first_name} {appt.patient.last_name}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {appt.patient.hospital_number}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {appt.appointment_type}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {appt.provider?.name || <span className="italic">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={appt.status} variant={getStatusVariant(appt.status)} />
                    </TableCell>
                    <TableCell>
                      <AppointmentActions appointment={appt} onAction={handleAction} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        open={showNewAppointment}
        onClose={() => setShowNewAppointment(false)}
        onCreated={handleAction}
      />
    </div>
  );
}
