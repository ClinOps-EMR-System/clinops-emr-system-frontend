"use client";

import { useAuth } from "@/store/RoleContext";
import { useFetch } from "@/lib/useFetch";
import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { StatsRow } from "@/components/receptionist/StatsRow";
import { QueuePreview } from "@/components/receptionist/QueuePreview";
import { QuickActions } from "@/components/receptionist/QuickActions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import LoadingState from "@/components/ui/LoadingState";
import {
  Card,
  CardAction,
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
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  ClipboardPlus,
  Search,
  Plus,
  Ambulance,
} from "lucide-react";
import Link from "next/link";

interface DashboardData {
  patients?: {
    total?: number;
    emergency?: number;
    today_registrations?: number;
  };
  encounters?: {
    awaiting_triage?: number;
    in_consultation?: number;
    emergency?: number;
    discharged_today?: number;
  };
  queue?: {
    waiting_for_doctor?: number;
    by_priority?: Record<string, number>;
    oldest_wait_time?: number;
  };
}

interface QueueStats {
  waiting_count?: number;
  in_consultation_count?: number;
  completed_count?: number;
  oldest_wait_time?: string;
  by_priority?: Record<string, number>;
}

interface QueueEntry {
  id: number;
  patient_id: number;
  encounter_id: number;
  priority: number;
  position: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
    full_name?: string;
  };
  entered_queue_at: string;
  chief_complaint?: string;
}

interface QueueData {
  entries: QueueEntry[];
  meta: {
    waiting_count: number;
    by_priority: Record<string, number>;
    oldest_wait_time: number;
  };
}

interface EmergencyWaitingPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  arrived_at: string;
  wait_minutes: number;
}

interface Appointment {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  scheduled_for: string;
  status: string;
  appointment_type: string;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-MW", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function AppointmentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "arrived":
      return <StatusBadge label={status} variant="success" />;
    case "confirmed":
      return <StatusBadge label={status} variant="info" />;
    case "completed":
      return <StatusBadge label={status} variant="neutral" />;
    default:
      return <StatusBadge label={status} variant="neutral" />;
  }
}

export default function ReceptionistDashboard() {
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const [checkinError, setCheckinError] = useState<string | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState<number | null>(null);
  const { data: dashboard, loading: dashLoading } = useFetch<DashboardData>("/dashboard");
  const { data: queueStats, loading: queueLoading } = useFetch<QueueStats>("/queue/stats", { interval: 30000 });
  const { data: queueData, loading: queueDataLoading } = useFetch<QueueData>("/queue", { interval: 30000 });
  const { data: emergencyWaitingData, loading: emergencyLoading } = useFetch<EmergencyWaitingPatient[]>(
    "/emergency/waiting",
    { interval: 30000 }
  );
  const { data: appointmentsData, loading: apptLoading, refetch: refetchAppointments } = useFetch<Appointment[]>(
    `/appointments?date=${new Date().toLocaleDateString("en-CA")}`
  );

  const loading = dashLoading || queueLoading || queueDataLoading || emergencyLoading || apptLoading;
  const appointments = appointmentsData ?? [];
  const emergencyWaiting = emergencyWaitingData ?? [];
  const queue = (queueData?.entries ?? []).map((e: QueueEntry) => ({
    id: e.id,
    patient: {
      id: e.patient.id,
      first_name: e.patient.first_name || e.patient.full_name?.split(" ")[0] || "",
      last_name: e.patient.last_name || e.patient.full_name?.split(" ").slice(1).join(" ") || e.patient.full_name || "",
      hospital_number: e.patient.hospital_number,
    },
    priority: typeof e.priority === "number" ? e.priority : parseInt(e.priority) || 3,
    entered_queue_at: e.entered_queue_at,
  }));

  const awaitingTriageCount = emergencyWaiting.length;
  const awaitingDoctorCount = queueStats?.waiting_count ?? dashboard?.queue?.waiting_for_doctor ?? 0;

  const stats = [
    { label: "Appointments", value: appointments.length, icon: CalendarDays, color: "text-sky-600", href: "/appointments" },
    { label: "Awaiting Triage", value: awaitingTriageCount, icon: Clock, color: "text-amber-600", href: "/triage-queue" },
    { label: "Awaiting Doctor", value: awaitingDoctorCount, icon: Users, color: "text-brand-green", href: "/queue" },
    { label: "In Consultation", value: queueStats?.in_consultation_count ?? dashboard?.encounters?.in_consultation ?? 0, icon: CheckCircle, color: "text-emerald-600", href: "/queue" },
    { label: "Emergency", value: dashboard?.encounters?.emergency ?? 0, icon: XCircle, color: "text-red-600", href: "/triage-queue", pulse: true },
    { label: "Registered Today", value: dashboard?.patients?.today_registrations ?? 0, icon: ClipboardPlus, color: "text-purple-600", href: "/patients/register" },
  ];

  const handleCheckIn = useCallback(async (appointmentId: number) => {
    if (!token || checkingIn) return;
    setCheckingIn(appointmentId);
    setCheckinError(null);
    try {
      await api.post(`/appointments/${appointmentId}/check-in`, {}, token);
      setCheckinSuccess(appointmentId);
      setCheckingIn(null);
      refetchAppointments();
      setTimeout(() => setCheckinSuccess(null), 3000);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setCheckinError(apiErr.message || "Check-in failed");
      setCheckingIn(null);
      setTimeout(() => setCheckinError(null), 5000);
    }
  }, [token, checkingIn, refetchAppointments]);

  const filteredAppointments = searchQuery
    ? appointments.filter((a) =>
        `${a.patient.first_name} ${a.patient.last_name} ${a.patient.hospital_number}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : appointments;

  if (loading) {
    return (
      <RoleGuard allowedRoles={["receptionist", "admin"]}>
        <LoadingState message="Loading front desk workspace..." />
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["receptionist", "admin"]}>
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Front Desk
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Good {getTimeOfDay()}, {user?.name?.split(" ")[0] || "Staff"}
          </h1>
          <p className="text-sm text-muted-foreground">{formatDate()}</p>
        </div>
        <div className="flex gap-3">
          <Button
            nativeButton={false}
            render={<Link href="/patients/register" />}
          >
            <Plus data-icon="inline-start" />
            Register Patient
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/patients/register?emergency=true" />}
          >
            <Ambulance data-icon="inline-start" />
            Emergency
          </Button>
        </div>
      </div>

      {/* Primary Metrics */}
      <StatsRow stats={stats} />

      {/* Patient Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search today's appointments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 pl-9"
        />
        {searchQuery && filteredAppointments.length === 0 && appointments.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            No appointments match your search.
          </p>
        )}
      </div>

      {/* Queue + Actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QueuePreview queue={queue} emergencyWaiting={emergencyWaiting} />
        <QuickActions />
      </div>

      {/* Check-in feedback */}
      {checkinSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <CheckCircle className="size-4 shrink-0 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-800">
            Patient checked in successfully
          </span>
        </div>
      )}
      {checkinError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 ring-1 ring-red-200">
          <XCircle className="size-4 shrink-0 text-red-600" />
          <span className="text-sm font-medium text-red-800">{checkinError}</span>
        </div>
      )}

      {/* Today's Appointments */}
      {appointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Today&apos;s Appointments
            </CardTitle>
            <CardAction>
              <Link
                href="/appointments"
                className="text-xs font-semibold text-clinical-primary hover:text-clinical-primary-hover"
              >
                View all
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.slice(0, 8).map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(appt.scheduled_for).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/patients/${appt.patient.id}`}
                        className="hover:text-clinical-primary hover:underline"
                      >
                        {appt.patient.first_name} {appt.patient.last_name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {appt.appointment_type}
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {appt.status !== "arrived" && appt.status !== "completed" && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleCheckIn(appt.id)}
                          disabled={checkingIn === appt.id}
                        >
                          {checkingIn === appt.id ? "Checking in..." : "Check In"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
    </RoleGuard>
  );
}
