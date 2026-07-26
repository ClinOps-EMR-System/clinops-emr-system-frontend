"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import LoadingState from "../../../components/ui/LoadingState";
import EmptyState from "../../../components/ui/EmptyState";

interface QueueEntry {
  id: number;
  patient_id: number;
  encounter_id: number;
  priority: string;
  position: number;
  patient: {
    hospital_number: string;
    full_name: string;
  };
  entered_queue_at: string;
  chief_complaint: string;
}

interface QueueData {
  entries: QueueEntry[];
  meta: {
    waiting_count: number;
    by_priority: Record<string, number>;
    oldest_wait_time: number;
  };
}

interface DashboardData {
  encounters: {
    pending_triage: number;
    in_consultation: number;
    discharged_today: number;
  };
}

function getWaitMinutes(enteredAt: string): number {
  return Math.round((Date.now() - new Date(enteredAt).getTime()) / 60000);
}

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function getPriorityStyle(priority: string): string {
  const p = priority?.toLowerCase();
  if (p === "high" || p === "urgent" || p === "1") return "bg-red-50 border-l-4 border-red-500";
  if (p === "medium" || p === "2") return "bg-amber-50 border-l-4 border-amber-500";
  return "bg-emerald-50/50 border-l-4 border-emerald-400";
}

function getPriorityBadge(priority: string): string {
  const p = priority?.toLowerCase();
  if (p === "high" || p === "urgent" || p === "1") return "bg-red-100 text-red-700";
  if (p === "medium" || p === "2") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

export default function NurseStationPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const { data: queueData, loading: queueLoading } = useFetch<QueueData>("/queue", { interval: 20000 });
  const { data: dashboard } = useFetch<DashboardData>("/dashboard", { interval: 30000 });
  const [startingId, setStartingId] = useState<number | null>(null);

  const entries = queueData?.entries || [];
  const stats = queueData?.meta || null;

  const handleStartTriage = async (entry: QueueEntry) => {
    if (!token || startingId) return;
    setStartingId(entry.id);
    try {
      await api.post(`/queue/${entry.id}/start`, {}, token);
      router.push(`/patients/${entry.patient_id}/triage`);
    } catch {
      setStartingId(null);
    }
  };

  const urgentEntries = entries.filter((e) => {
    const p = e.priority?.toLowerCase();
    return p === "high" || p === "urgent" || p === "1";
  });

  const otherEntries = entries.filter((e) => {
    const p = e.priority?.toLowerCase();
    return p !== "high" && p !== "urgent" && p !== "1";
  });

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

      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Waiting",
            value: stats?.waiting_count ?? entries.length,
            color: "text-gray-900",
            bg: "bg-white",
          },
          {
            label: "Pending Triage",
            value: dashboard?.encounters?.pending_triage ?? "—",
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "In Consultation",
            value: dashboard?.encounters?.in_consultation ?? "—",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Discharged Today",
            value: dashboard?.encounters?.discharged_today ?? "—",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded border border-[#becab7]/50 p-4`}>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">{stat.label}</p>
            <p className={`text-3xl font-extrabold font-mono mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      {queueLoading ? (
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
                          {entry.patient.full_name}
                        </Link>
                        <span className="text-xs font-mono text-gray-500">{entry.patient.hospital_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPriorityBadge(entry.priority)}`}>
                          {entry.priority?.toUpperCase()}
                        </span>
                      </div>
                      {entry.chief_complaint && (
                        <p className="text-sm text-gray-600 mt-1 truncate">
                          <span className="font-semibold">CC:</span> {entry.chief_complaint}
                        </p>
                      )}
                      <p className={`text-xs font-mono mt-1 ${getWaitColor(getWaitMinutes(entry.entered_queue_at))}`}>
                        Waiting {getWaitMinutes(entry.entered_queue_at)} min
                      </p>
                    </div>
                    <button
                      onClick={() => handleStartTriage(entry)}
                      disabled={startingId === entry.id}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded hover:bg-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {startingId === entry.id ? "Starting..." : "Start Triage"}
                    </button>
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
                description="All patients have been triaged or the queue is empty"
              />
            ) : otherEntries.length === 0 && urgentEntries.length > 0 ? (
              <p className="text-sm text-gray-500 italic">All waiting patients are urgent — see above</p>
            ) : (
              <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#fcf9f8]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Chief Complaint</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Wait</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
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
                            {entry.patient.full_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-gray-500">{entry.patient.hospital_number}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPriorityBadge(entry.priority)}`}>
                            {entry.priority?.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{entry.chief_complaint || "—"}</td>
                        <td className={`px-6 py-4 text-xs font-mono ${getWaitColor(getWaitMinutes(entry.entered_queue_at))}`}>
                          {getWaitMinutes(entry.entered_queue_at)}m
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleStartTriage(entry)}
                            disabled={startingId === entry.id}
                            className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider disabled:opacity-50"
                          >
                            {startingId === entry.id ? "Starting..." : "Start Triage"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Today's Summary */}
          {stats && (
            <section className="bg-[#fcf9f8] rounded border border-[#becab7]/50 p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Queue Summary</h3>
              <div className="flex flex-wrap gap-4 text-sm font-mono">
                <span>Waiting: <strong>{stats.waiting_count}</strong></span>
                {stats.by_priority && Object.entries(stats.by_priority).map(([key, val]) => (
                  <span key={key} className="capitalize">
                    {key}: <strong>{val}</strong>
                  </span>
                ))}
                {stats.oldest_wait_time > 0 && (
                  <span>Longest wait: <strong>{stats.oldest_wait_time}m</strong></span>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
