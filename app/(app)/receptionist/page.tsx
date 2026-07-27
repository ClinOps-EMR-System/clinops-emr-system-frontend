"use client";

import { useAuth } from "@/store/RoleContext";
import { useFetch } from "@/lib/useFetch";
import { useState } from "react";
import { api } from "@/lib/api";
import { StatsRow } from "@/components/receptionist/StatsRow";
import { QueuePreview } from "@/components/receptionist/QueuePreview";
import { QuickActions } from "@/components/receptionist/QuickActions";
import { RoleGuard } from "@/components/auth/RoleGuard";
import LoadingState from "@/components/ui/LoadingState";
import { CalendarDays, Users, Clock, CheckCircle, XCircle, ClipboardPlus, Search } from "lucide-react";
import Link from "next/link";

interface DashboardData {
  pending_triage?: number;
  in_consultation?: number;
  emergency?: number;
  discharged_today?: number;
  total_patients?: number;
  registered_today?: number;
}

interface QueueStats {
  waiting_count?: number;
  in_consultation_count?: number;
  completed_count?: number;
  oldest_wait_time?: string;
  by_priority?: Array<{
    id?: number;
    patient: {
      id: number;
      first_name: string;
      last_name: string;
      hospital_number: string;
    };
    priority: number;
    entered_queue_at: string;
  }>;
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

export default function ReceptionistDashboard() {
  const { user, token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [checkingIn, setCheckingIn] = useState<number | null>(null);
  const { data: dashboard, loading: dashLoading } = useFetch<DashboardData>("/dashboard");
  const { data: queueStats, loading: queueLoading } = useFetch<QueueStats>("/queue/stats", { interval: 30000 });
  const { data: appointmentsData, loading: apptLoading } = useFetch<{ data: Appointment[] }>(
    `/appointments?date=${new Date().toISOString().split("T")[0]}`
  );

  const loading = dashLoading || queueLoading || apptLoading;
  const appointments = appointmentsData?.data ?? [];
  const queue = queueStats?.by_priority ?? [];

  const stats = [
    { label: "Appointments", value: appointments.length, icon: CalendarDays, color: "bg-sky-500" },
    { label: "Arrived", value: queueStats?.in_consultation_count ?? dashboard?.in_consultation ?? 0, icon: Users, color: "bg-brand-green" },
    { label: "Waiting", value: queueStats?.waiting_count ?? dashboard?.pending_triage ?? 0, icon: Clock, color: "bg-amber-500" },
    { label: "Completed", value: queueStats?.completed_count ?? dashboard?.discharged_today ?? 0, icon: CheckCircle, color: "bg-emerald-500" },
    { label: "Emergency", value: dashboard?.emergency ?? 0, icon: XCircle, color: "bg-red-500" },
    { label: "Registered Today", value: dashboard?.registered_today ?? 0, icon: ClipboardPlus, color: "bg-purple-500" },
  ];

  const handleCheckIn = async (appointmentId: number) => {
    if (!token || checkingIn) return;
    setCheckingIn(appointmentId);
    try {
      await api.post(`/appointments/${appointmentId}/check-in`, {}, token);
      window.location.reload();
    } catch {
      setCheckingIn(null);
    }
  };

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
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Front Desk</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">
          Good {getTimeOfDay()}, {user?.name?.split(" ")[0] || "Staff"}
        </h1>
        <p className="text-sm text-[#5f5e5e] mt-1 font-mono">{formatDate()}</p>
      </section>

      {/* Stats */}
      <StatsRow stats={stats} />

      {/* Patient Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search patients by name or hospital number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
        />
        {searchQuery && filteredAppointments.length === 0 && appointments.length > 0 && (
          <p className="text-xs text-gray-400 mt-1">No appointments match your search.</p>
        )}
      </div>

      {/* Queue + Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QueuePreview queue={queue} />
        <QuickActions />
      </div>

      {/* Today's Appointments */}
      {appointments.length > 0 && (
        <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
              <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Today&apos;s Appointments</h3>
            </div>
            <a href="/appointments" className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider">
              View All
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredAppointments.slice(0, 8).map((appt) => (
                  <tr key={appt.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                    <td className="px-6 py-3 text-sm font-mono text-gray-600">
                      {new Date(appt.scheduled_for).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                      <Link href={`/patients/${appt.patient.id}`} className="hover:text-clinical-primary hover:underline">
                        {appt.patient.first_name} {appt.patient.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">{appt.appointment_type}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        appt.status === "arrived" ? "bg-brand-green/10 text-brand-green" :
                        appt.status === "confirmed" ? "bg-sky-100 text-sky-700" :
                        appt.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {appt.status !== "arrived" && appt.status !== "completed" && (
                        <button
                          onClick={() => handleCheckIn(appt.id)}
                          disabled={checkingIn === appt.id}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                        >
                          {checkingIn === appt.id ? "Checking in..." : "Check In"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
