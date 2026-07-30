"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
import LoadingState from "../../../components/ui/LoadingState";
import EmptyState from "../../../components/ui/EmptyState";
import { AlertTriangle } from "lucide-react";

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

function getWaitColor(minutes: number): string {
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function getPriorityLabel(priority: number): string {
  if (priority <= 1) return "CRITICAL";
  if (priority === 2) return "URGENT";
  if (priority === 3) return "HIGH";
  if (priority === 4) return "MEDIUM";
  return "LOW";
}

function getPriorityStyle(priority: number): string {
  if (priority <= 2) return "bg-red-50 border-l-4 border-red-500";
  if (priority === 3) return "bg-amber-50 border-l-4 border-amber-500";
  return "bg-emerald-50 border-l-4 border-emerald-400";
}

function getPriorityBadge(priority: number): string {
  if (priority <= 2) return "bg-red-100 text-red-800 border border-red-200";
  if (priority === 3) return "bg-amber-100 text-amber-800 border border-amber-200";
  return "bg-emerald-100 text-emerald-800 border border-emerald-200";
}

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

  const loading = emergLoading || apptLoading;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unwrap = (val: any): any[] => (Array.isArray(val) ? val : val?.data) ?? [];
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

  const urgentEntries = entries.filter((e) => e.priority <= 2);
  const otherEntries = entries.filter((e) => e.priority > 2);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Nurse Station</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">
          {greeting()}, {user?.name?.split(" ")[0] || "Nurse"}
        </h1>
        <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
          Your clinical workspace — patients waiting for triage
        </p>
      </section>

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
                  <span className="text-xs font-mono font-bold">Lvl {p.severity_level}</span>
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
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Waiting for Triage", value: entries.length, color: "text-gray-900", bg: "bg-white", href: "/triage-queue" },
          { label: "Awaiting Triage", value: dashboard?.encounters?.awaiting_triage ?? "—", color: "text-amber-600", bg: "bg-amber-50", href: "/triage-queue" },
          { label: "In Consultation", value: dashboard?.encounters?.in_consultation ?? "—", color: "text-blue-600", bg: "bg-blue-50", href: "/queue" },
          { label: "Discharged Today", value: dashboard?.encounters?.discharged_today ?? "—", color: "text-emerald-600", bg: "bg-emerald-50", href: "/admissions" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} className={`${stat.bg} rounded border border-[#becab7]/50 p-4 hover:shadow-sm transition-all block`}>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-extrabold font-mono mt-1 ${stat.color}`}>{stat.value}</p>
          </Link>
        ))}
      </section>

      {loading ? (
        <LoadingState message="Loading nurse station..." />
      ) : (
        <>
          {/* Urgent Patients */}
          {urgentEntries.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                <h2 className="text-lg font-bold text-red-700">Urgent — Requires Immediate Attention</h2>
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                  {urgentEntries.length}
                </span>
              </div>
              <div className="space-y-3">
                {urgentEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Link
                          href={`/patients/${entry.patient_id}`}
                          className="text-base font-bold text-gray-900 hover:text-red-600 hover:underline"
                        >
                          {entry.full_name}
                        </Link>
                        <span className="text-xs font-mono text-gray-500">{entry.hospital_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPriorityBadge(entry.priority)}`}>
                          {getPriorityLabel(entry.priority)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200`}>
                          {entry.source === "emergency" ? "ER" : "Appt"}
                        </span>
                      </div>
                      {entry.chief_complaint && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          <span className="font-semibold">CC:</span> {entry.chief_complaint}
                        </p>
                      )}
                      <p className={`text-xs font-mono mt-1 ${getWaitColor(entry.wait_minutes)}`}>
                        Waiting {entry.wait_minutes} min
                      </p>
                    </div>
                    <Link
                      href={`/patients/${entry.patient_id}/triage`}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 transition-colors whitespace-nowrap text-center"
                    >
                      Start Triage
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Waiting List */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold text-gray-900">Waiting List</h2>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                {otherEntries.length}
              </span>
            </div>

            {entries.length === 0 ? (
              <EmptyState
                title="No patients waiting"
                description="All patients have been triaged. Check with reception for new arrivals."
                action={
                  <Link href="/triage-queue" className="inline-flex items-center px-4 py-2 bg-clinical-primary text-white text-sm font-bold rounded hover:bg-clinical-primary-hover transition-colors">
                    View Queue
                  </Link>
                }
              />
            ) : otherEntries.length === 0 && urgentEntries.length > 0 ? (
              <p className="text-sm text-gray-500 italic">All waiting patients are urgent — see above</p>
            ) : (
              <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Priority</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider hidden lg:table-cell">Chief Complaint</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Wait</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {otherEntries.map((entry) => (
                      <tr key={entry.id} className={`${getPriorityStyle(entry.priority)} hover:brightness-95 transition-all`}>
                        <td className="px-6 py-4">
                          <Link
                            href={`/patients/${entry.patient_id}`}
                            className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline"
                          >
                            {entry.full_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{entry.hospital_number}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPriorityBadge(entry.priority)}`}>
                            {getPriorityLabel(entry.priority)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">{entry.chief_complaint || "—"}</td>
                        <td className={`px-6 py-4 text-xs font-mono ${getWaitColor(entry.wait_minutes)}`}>
                          {entry.wait_minutes}m
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/patients/${entry.patient_id}/triage`}
                            className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
                          >
                            Start Triage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
