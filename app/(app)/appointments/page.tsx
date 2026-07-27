"use client";

import { useState, useCallback } from "react";
import { useFetch } from "@/lib/useFetch";
import { AppointmentActions } from "@/components/appointments/AppointmentActions";
import { NewAppointmentModal } from "@/components/appointments/NewAppointmentModal";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { CalendarDays, Plus } from "lucide-react";

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

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
  const s = status?.toLowerCase();
  if (s === "checked-in" || s === "arrived") return "success";
  if (s === "confirmed" || s === "scheduled") return "info";
  if (s === "completed") return "success";
  if (s === "cancelled" || s === "no-show" || s === "no_show") return "error";
  return "neutral";
}

export default function AppointmentsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  });
  const { data, loading, refetch } = useFetch<{ data: Appointment[] }>(
    `/appointments?date=${today}`,
    { interval: 30000 }
  );

  const appointments = data?.data ?? [];

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
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Scheduling</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Appointments</h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            {new Date().toLocaleDateString("en-MW", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowNewAppointment(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          New Appointment
        </button>
      </section>

      {/* Status Tabs */}
      <section className="flex gap-1 bg-white rounded border border-[#becab7]/50 p-1 overflow-x-auto" role="tablist" aria-label="Appointment status filter">
        {([["all", "All"], ["confirmed", "Confirmed"], ["arrived", "Arrived"], ["completed", "Completed"], ["cancelled", "Cancelled"], ["no_show", "No-show"]] as const).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm font-bold rounded transition-all ${
              statusFilter === key
                ? "bg-clinical-primary text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </section>

      {/* Appointments Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Today&apos;s Appointments</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading appointments..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6 text-gray-400" />}
            title="No appointments"
            description={statusFilter === "all" ? "No appointments scheduled for today" : `No ${statusFilter} appointments`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Provider</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map((appt) => (
                  <tr key={appt.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {new Date(appt.scheduled_for).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {appt.patient.first_name} {appt.patient.last_name}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{appt.patient.hospital_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{appt.appointment_type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {appt.provider?.name || <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge label={appt.status} variant={getStatusVariant(appt.status)} />
                    </td>
                    <td className="px-6 py-4">
                      <AppointmentActions appointment={appt} onAction={handleAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        open={showNewAppointment}
        onClose={() => setShowNewAppointment(false)}
        onCreated={handleAction}
      />
    </div>
  );
}
