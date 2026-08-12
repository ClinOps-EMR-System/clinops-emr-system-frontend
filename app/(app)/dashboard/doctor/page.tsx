"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { useFetch } from "@/lib/useFetch";
import { api } from "@/lib/api";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import {
  Users,
  Clock,
  Stethoscope,
  ArrowRight,
  Activity,
  HeartPulse,
  CalendarClock,
  AlertTriangle,
  User,
  MessageSquare,
} from "lucide-react";

interface QueueEntry {
  id: number;
  patient: {
    id: number;
    hospital_number: string;
    first_name: string;
    last_name: string;
    gender: string;
  };
  priority: number;
  status: string;
  entered_queue_at: string;
  started_at: string | null;
  encounter: {
    id: number;
    chief_complaint: string | null;
  };
}

interface ResuscitationEntry {
  encounter_id: number;
  patient: {
    id: number;
    hospital_number: string;
    first_name: string;
    last_name: string;
    gender: string;
  };
  team_lead_id: number;
  activated_at: string;
  rhythm: string | null;
  outcome: string;
}

interface AppointmentEntry {
  id: number;
  patient: {
    id: number;
    hospital_number: string;
    first_name: string;
    last_name: string;
    gender: string;
  };
  scheduled_for: string;
  appointment_type: string;
  status: string;
  reason: string | null;
}

interface DoctorDashboardData {
  my_queue: QueueEntry[];
  waiting_unassigned: QueueEntry[];
  resuscitations: ResuscitationEntry[];
  my_appointments: AppointmentEntry[];
  kpis: {
    consultations_today: number;
    patients_waiting: number;
    avg_wait_minutes: number;
    in_consultation_now: number;
  };
}

function getPriorityBadge(priority: number) {
  if (priority <= 2) return { label: priority === 1 ? "Critical" : "Urgent", variant: "destructive" as const, pulse: priority === 1 };
  if (priority === 3) return { label: "High", variant: "secondary" as const };
  if (priority === 4) return { label: "Medium", variant: "outline" as const };
  return { label: "Low", variant: "outline" as const };
}

function getWaitTime(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getWaitColor(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins >= 30) return "text-red-600 font-bold";
  if (mins >= 15) return "text-amber-600 font-semibold";
  return "text-muted-foreground";
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" }> = {
    scheduled: { label: "Scheduled", variant: "info" },
    checked_in: { label: "Checked In", variant: "success" },
    in_progress: { label: "In Progress", variant: "warning" },
    no_show: { label: "No Show", variant: "error" },
  };
  return map[status] || { label: status, variant: "neutral" as const };
}

export default function DoctorDashboardPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { data, loading, error } = useFetch<DoctorDashboardData>("/dashboard/doctor", { interval: 20000 });

  const [takingId, setTakingId] = useState<number | null>(null);

  const staffName = user?.name?.split(" ")[0] || "Doctor";

  async function handleTake(entryId: number) {
    if (!token || takingId) return;
    setTakingId(entryId);
    try {
      await api.post(`/queue/${entryId}/start`, {}, token);
      success("Consultation started");
      router.push(`/patients/${data?.my_queue.find((e) => e.id === entryId)?.patient.id ?? ""}`);
    } catch {
      toastError("Failed to start consultation");
    } finally {
      setTakingId(null);
    }
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <p className="text-muted-foreground">Failed to load dashboard. Please try again.</p>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Consultant Dashboard
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, Dr. {staffName}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              My Queue
            </CardTitle>
            <Stethoscope className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : kpis?.in_consultation_now ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Waiting
            </CardTitle>
            <Users className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-3xl font-semibold tabular-nums tracking-tight",
              (kpis?.patients_waiting ?? 0) > 0 ? "text-amber-600" : "text-foreground"
            )}>
              {loading ? <Skeleton className="h-8 w-16" /> : kpis?.patients_waiting ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Consultations Today
            </CardTitle>
            <Activity className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : kpis?.consultations_today ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Wait
            </CardTitle>
            <Clock className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : `${kpis?.avg_wait_minutes ?? 0}m`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Patients (in consultation) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            My Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.my_queue && data.my_queue.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead className="w-20">Wait</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.my_queue.map((entry) => {
                  const pBadge = getPriorityBadge(entry.priority);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant={pBadge.variant} className={pBadge.pulse ? "animate-pulse" : ""}>
                          {pBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {entry.patient.first_name} {entry.patient.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.patient.hospital_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {entry.encounter?.chief_complaint || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={getWaitColor(entry.entered_queue_at)}>
                          {entry.started_at ? getWaitTime(entry.started_at) : getWaitTime(entry.entered_queue_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          nativeButton={false}
                          render={<Link href={`/patients/${entry.patient.id}/consultation`} />}
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          Consult
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No patients in your queue right now.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Waiting (unassigned) */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Waiting for Doctor
          </CardTitle>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/consultation-queue" />}>
            View Full Queue
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.waiting_unassigned && data.waiting_unassigned.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Chief Complaint</TableHead>
                  <TableHead className="w-20">Wait</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.waiting_unassigned.map((entry) => {
                  const pBadge = getPriorityBadge(entry.priority);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Badge variant={pBadge.variant} className={pBadge.pulse ? "animate-pulse" : ""}>
                          {pBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {entry.patient.first_name} {entry.patient.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {entry.patient.hospital_number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {entry.encounter?.chief_complaint || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={getWaitColor(entry.entered_queue_at)}>
                          {getWaitTime(entry.entered_queue_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => void handleTake(entry.id)}
                          disabled={takingId === entry.id}
                        >
                          {takingId === entry.id ? "Taking…" : "Take"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No patients waiting in the queue.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resuscitation + Appointments side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Resuscitation */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              Resuscitation
            </CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/resuscitation" />}>
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-20 w-full" />
            ) : data?.resuscitations && data.resuscitations.length > 0 ? (
              <div className="space-y-3">
                {data.resuscitations.map((resus) => (
                  <div
                    key={resus.encounter_id}
                    className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-red-900">
                        {resus.patient.first_name} {resus.patient.last_name}
                      </span>
                      <span className="text-xs text-red-700">
                        {resus.patient.hospital_number}
                        {resus.rhythm ? ` · ${resus.rhythm}` : ""}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      nativeButton={false}
                      render={<Link href={`/patients/${resus.patient.id}`} />}
                    >
                      Manage
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No active resuscitations.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <CalendarClock className="h-3.5 w-3.5" />
              My Appointments
            </CardTitle>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/appointments" />}>
              View All
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : data?.my_appointments && data.my_appointments.length > 0 ? (
              <div className="space-y-2">
                {data.my_appointments.map((appt) => {
                  const statusBadge = getStatusBadge(appt.status);
                  return (
                    <div
                      key={appt.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-12">
                          <span className="text-sm font-semibold tabular-nums">
                            {formatTime(appt.scheduled_for)}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {appt.patient.first_name} {appt.patient.last_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {appt.appointment_type}
                            {appt.reason ? ` · ${appt.reason}` : ""}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={statusBadge.label} variant={statusBadge.variant} />
                        {appt.status === "checked_in" && (
                          <Button
                            size="sm"
                            nativeButton={false}
                            render={<Link href={`/patients/${appt.patient.id}/consultation`} />}
                          >
                            Start
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No appointments scheduled for today.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
