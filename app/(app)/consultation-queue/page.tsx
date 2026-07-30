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
  priority: number; // 1–5 SATS level
  position: number;
  patient: {
    hospital_number: string;
    full_name: string;
  };
  entered_queue_at: string;
  chief_complaint: string;
  workflow_state?: string;
  encounter_status?: string;
}

interface QueueData {
  entries: QueueEntry[];
  meta: {
    waiting_count: number;
    by_priority: Record<string, number>;
    oldest_wait_time: number;
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

function getPriorityLabel(priority: number): string {
  if (priority === 1) return "L1 - RED (RESUSCITATION)";
  if (priority === 2) return "L2 - ORANGE (VERY URGENT)";
  if (priority === 3) return "L3 - YELLOW (URGENT)";
  if (priority === 4) return "L4 - GREEN (STANDARD)";
  return "L5 - BLUE (NON-URGENT)";
}

function getPriorityBadge(priority: number): string {
  if (priority === 1) return "bg-red-600 text-white font-bold animate-pulse";
  if (priority === 2) return "bg-orange-500 text-white font-bold";
  if (priority === 3) return "bg-amber-400 text-amber-950 font-bold";
  if (priority === 4) return "bg-emerald-500 text-white font-bold";
  return "bg-blue-500 text-white font-bold";
}

function getPriorityBorder(priority: number): string {
  if (priority === 1) return "border-l-4 border-l-red-600 bg-red-50/20";
  if (priority === 2) return "border-l-4 border-l-orange-500 bg-orange-50/20";
  if (priority === 3) return "border-l-4 border-l-amber-400";
  if (priority === 4) return "border-l-4 border-l-emerald-500";
  return "border-l-4 border-l-blue-500";
}

type WorklistTab = "all" | "resuscitation" | "waiting" | "results" | "observation";

export default function DoctorWorklistPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: queueRaw, loading } = useFetch<QueueData>("/queue", { interval: 15000 });
  const [activeTab, setActiveTab] = useState<WorklistTab>("all");
  const [openingId, setOpeningId] = useState<number | null>(null);

  const entries = queueRaw?.entries || [];
  const stats = queueRaw?.meta || null;

  const resuscitationCases = entries.filter((e) => Number(e.priority) === 1);
  const waitingCases = entries.filter((e) => Number(e.priority) >= 2 && Number(e.priority) <= 4);
  const resultsCases = entries.filter((e) => e.workflow_state === "awaiting_results" || e.workflow_state === "orders_pending");
  const observationCases = entries.filter((e) => e.workflow_state === "observation");

  const handleOpenCase = async (entry: QueueEntry) => {
    if (!token || openingId) return;
    setOpeningId(entry.id);
    try {
      if (entry.encounter_status === "Checked-in" || entry.encounter_status === "Triage Complete") {
        await api.post(`/queue/${entry.id}/start`, {}, token);
      }
      router.push(`/patients/${entry.patient_id}/consultation`);
    } catch {
      setOpeningId(null);
    }
  };

  const getFilteredEntries = () => {
    const sorted = [...entries].sort((a, b) => {
      if (a.priority !== b.priority) return Number(a.priority) - Number(b.priority);
      return getWaitMinutes(b.entered_queue_at) - getWaitMinutes(a.entered_queue_at);
    });

    if (activeTab === "resuscitation") return sorted.filter((e) => Number(e.priority) === 1);
    if (activeTab === "waiting") return sorted.filter((e) => Number(e.priority) >= 2);
    if (activeTab === "results") return resultsCases;
    if (activeTab === "observation") return observationCases;
    return sorted;
  };

  const filtered = getFilteredEntries();

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Clinician Workspace</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Doctor Worklist</h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            State-driven clinical case management & active patient tracking
          </p>
        </div>

        {/* Worklist Section Filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded p-1" role="tablist">
          {([
            ["all", "All Cases", entries.length],
            ["resuscitation", "🔴 Resuscitation", resuscitationCases.length],
            ["waiting", "🟠 Waiting", waitingCases.length],
            ["results", "🟡 Results", resultsCases.length],
            ["observation", "🔵 Observation", observationCases.length],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              <span className="ml-1.5 font-mono text-[10px] bg-gray-200/80 px-1.5 py-0.5 rounded">{count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Resuscitation Emergency Alert Banner */}
      {resuscitationCases.length > 0 && (
        <section className="bg-red-600 text-white rounded-lg p-4 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-white animate-ping" />
            <div>
              <span className="font-extrabold text-sm uppercase tracking-wider">🔴 Resuscitation Alert</span>
              <p className="text-xs opacity-90">
                {resuscitationCases.length} patient{resuscitationCases.length !== 1 ? "s" : ""} require immediate resuscitation & stabilization
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab("resuscitation")}
            className="px-3 py-1.5 bg-white text-red-700 text-xs font-bold rounded hover:bg-red-50 uppercase tracking-wide"
          >
            View Urgent
          </button>
        </section>
      )}

      {/* Stats Bar */}
      {stats && (
        <section className="flex items-center gap-4 text-xs font-mono text-gray-500 flex-wrap">
          <span>Active Cases: <strong className="text-gray-900">{entries.length}</strong></span>
          <span>·</span>
          <span className="text-red-600 font-semibold">Resuscitation: <strong>{resuscitationCases.length}</strong></span>
          <span>·</span>
          <span className="text-orange-600 font-semibold">Urgent: <strong>{waitingCases.length}</strong></span>
          {stats.oldest_wait_time > 0 && (
            <>
              <span>·</span>
              <span>Longest wait: <strong>{stats.oldest_wait_time}m</strong></span>
            </>
          )}
        </section>
      )}

      {loading ? (
        <LoadingState message="Loading doctor worklist..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No active cases in this section"
          description="All patients in this workflow state have been attended to"
        />
      ) : (
        <section className="space-y-4">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className={`border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm ${getPriorityBorder(entry.priority)}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <Link
                    href={`/patients/${entry.patient_id}/consultation`}
                    className="text-base font-bold text-gray-900 hover:text-clinical-primary hover:underline"
                  >
                    {entry.patient.full_name}
                  </Link>
                  <span className="text-xs font-mono text-gray-500">{entry.patient.hospital_number}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold font-mono ${getPriorityBadge(entry.priority)}`}>
                    {getPriorityLabel(entry.priority)}
                  </span>
                  <span className={`text-xs font-mono ${getWaitColor(getWaitMinutes(entry.entered_queue_at))}`}>
                    {getWaitMinutes(entry.entered_queue_at)}m wait
                  </span>
                </div>
                {entry.chief_complaint && (
                  <p className="text-sm text-gray-700 mt-1 font-medium">
                    <span className="font-semibold text-gray-500 uppercase text-xs tracking-wide">Chief Complaint:</span> {entry.chief_complaint}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleOpenCase(entry)}
                disabled={openingId === entry.id}
                className="px-6 py-2.5 bg-clinical-primary text-white text-xs font-extrabold uppercase tracking-wider rounded-md hover:bg-clinical-primary-hover transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {openingId === entry.id ? "Opening..." : "Open Case"}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
