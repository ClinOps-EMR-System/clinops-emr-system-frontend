"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
import { api } from "../../../lib/api";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";

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

type CategoryFilter = "all" | "high" | "medium" | "low";

function getWaitMinutes(enteredAt: string): number {
  return Math.round((Date.now() - new Date(enteredAt).getTime()) / 60000);
}

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function getEwsBadgeStyle(priority: string): string {
  const p = priority?.toLowerCase();
  if (p === "high" || p === "urgent" || p === "1") return "bg-red-100 text-red-800 border-red-200";
  if (p === "medium" || p === "2") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function getRowBorder(priority: string): string {
  const p = priority?.toLowerCase();
  if (p === "high" || p === "urgent" || p === "1") return "border-l-4 border-l-red-500";
  if (p === "medium" || p === "2") return "border-l-4 border-l-amber-400";
  return "border-l-4 border-l-emerald-400";
}

export default function TriageQueuePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: queueData, loading, error } = useFetch<QueueData>("/queue", { interval: 20000 });
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
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

  const filteredEntries = (() => {
    const sorted = [...entries].sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, urgent: 0, medium: 1, low: 2 };
      const aVal = priorityOrder[a.priority?.toLowerCase()] ?? 2;
      const bVal = priorityOrder[b.priority?.toLowerCase()] ?? 2;
      if (aVal !== bVal) return aVal - bVal;
      return getWaitMinutes(b.entered_queue_at) - getWaitMinutes(a.entered_queue_at);
    });
    if (categoryFilter === "all") return sorted;
    if (categoryFilter === "high") return sorted.filter((e) => ["high", "urgent"].includes(e.priority?.toLowerCase()));
    if (categoryFilter === "medium") return sorted.filter((e) => e.priority?.toLowerCase() === "medium");
    return sorted.filter((e) => e.priority?.toLowerCase() === "low");
  })();

  const highCount = entries.filter((e) => ["high", "urgent"].includes(e.priority?.toLowerCase())).length;
  const medCount = entries.filter((e) => e.priority?.toLowerCase() === "medium").length;
  const lowCount = entries.filter((e) => e.priority?.toLowerCase() === "low").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Triage</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Triage Queue</h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            Patients waiting for triage, sorted by clinical urgency
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5" role="radiogroup" aria-label="Filter by triage category">
          {([["all", "All"], ["high", "High"], ["medium", "Med"], ["low", "Low"]] as const).map(([key, label]) => (
            <button
              key={key}
              role="radio"
              aria-checked={categoryFilter === key}
              onClick={() => setCategoryFilter(key)}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                categoryFilter === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              {key !== "all" && (
                <span className="ml-1 font-mono text-[10px]">
                  {key === "high" ? highCount : key === "medium" ? medCount : lowCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Summary Line */}
      <section className="flex items-center gap-4 text-sm font-mono flex-wrap">
        <span className="text-gray-500">
          {filteredEntries.length} patient{filteredEntries.length !== 1 ? "s" : ""} in queue
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-red-600 font-semibold">{highCount} high priority</span>
        <span className="text-gray-300">·</span>
        <span className="text-amber-600 font-semibold">{medCount} medium</span>
        <span className="text-gray-300">·</span>
        <span className="text-emerald-600 font-semibold">{lowCount} low</span>
        {stats?.oldest_wait_time ? (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">Longest wait: <strong>{stats.oldest_wait_time}m</strong></span>
          </>
        ) : null}
      </section>

      {/* Queue Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Waiting List</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading triage queue..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            title="No patients in queue"
            description="Register a new patient or check if patients are waiting at reception"
            action={
              <Link href="/patients/register" className="inline-flex items-center px-4 py-2 bg-clinical-primary text-white text-sm font-bold rounded hover:bg-clinical-primary-hover transition-colors">
                Register Patient
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Chief Complaint</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Time Waiting</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`${getRowBorder(entry.priority)} hover:bg-[#fcf9f8]/40 transition-all divide-x divide-gray-100`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/patients/${entry.patient_id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline"
                      >
                        {entry.patient.full_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {entry.patient.hospital_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded border text-sm font-extrabold font-mono ${getEwsBadgeStyle(entry.priority)}`}
                      >
                        {entry.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {entry.chief_complaint || "—"}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs font-mono ${getWaitColor(getWaitMinutes(entry.entered_queue_at))}`}>
                      {getWaitMinutes(entry.entered_queue_at)}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
    </div>
  );
}
