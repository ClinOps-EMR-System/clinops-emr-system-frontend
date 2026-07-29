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
  priority: number; // backend sends integer 1–5
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

function getWaitMinutes(enteredAt: string): number {
  return Math.round((Date.now() - new Date(enteredAt).getTime()) / 60000);
}

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
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

function getPriorityBadge(priority: number): string {
  if (priority <= 2) return "bg-red-100 text-red-700";
  if (priority === 3) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function getPriorityBorder(priority: number): string {
  if (priority <= 2) return "border-red-200 bg-red-50/30";
  if (priority === 3) return "border-amber-200 bg-amber-50/30";
  return "border-gray-200 bg-white";
}

type FilterType = "all" | "high" | "medium" | "low";

export default function ConsultationQueuePage() {
  const router = useRouter();
  const { token } = useAuth();
  const { data: queueRaw, loading } = useFetch<QueueData>("/queue", { interval: 20000 });
  const [filter, setFilter] = useState<FilterType>("all");
  const [startingId, setStartingId] = useState<number | null>(null);

  const entries = queueRaw?.entries || [];
  const stats = queueRaw?.meta || null;

  const handleStartConsultation = async (entry: QueueEntry) => {
    if (!token || startingId) return;
    setStartingId(entry.id);
    try {
      await api.post(`/queue/${entry.id}/start`, {}, token);
      router.push(`/patients/${entry.patient_id}`);
    } catch {
      setStartingId(null);
    }
  };

  const getFilteredEntries = () => {
    const sorted = [...entries].sort((a, b) => {
      if (a.priority !== b.priority) return Number(a.priority) - Number(b.priority);
      return getWaitMinutes(b.entered_queue_at) - getWaitMinutes(a.entered_queue_at);
    });

    if (filter === "all") return sorted;
    if (filter === "high") return sorted.filter((e) => Number(e.priority) <= 2);
    if (filter === "medium") return sorted.filter((e) => Number(e.priority) === 3);
    return sorted.filter((e) => Number(e.priority) >= 4);
  };

  const filtered = getFilteredEntries();
  const highCount = entries.filter((e) => Number(e.priority) <= 2).length;
  const medCount = entries.filter((e) => Number(e.priority) === 3).length;
  const lowCount = entries.filter((e) => Number(e.priority) >= 4).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Clinical</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Consultation Queue</h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            Patients triaged and ready for clinical consultation
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded p-0.5" role="radiogroup" aria-label="Filter by priority">
          {([["all", "All", entries.length], ["high", "High", highCount], ["medium", "Med", medCount], ["low", "Low", lowCount]] as const).map(([key, label, count]) => (
            <button
              key={key}
              role="radio"
              aria-checked={filter === key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                filter === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
              <span className="ml-1 font-mono text-[10px]">{count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Stats Bar */}
      {stats && (
        <section className="flex items-center gap-4 text-sm font-mono flex-wrap">
          <span className="text-gray-500">Waiting: <strong className="text-gray-900">{stats.waiting_count}</strong></span>
          <span className="text-gray-300">·</span>
          <span className="text-red-600">High: <strong>{highCount}</strong></span>
          <span className="text-gray-300">·</span>
          <span className="text-amber-600">Medium: <strong>{medCount}</strong></span>
          <span className="text-gray-300">·</span>
          <span className="text-emerald-600">Low: <strong>{lowCount}</strong></span>
          {stats.oldest_wait_time > 0 && (
            <>
              <span className="text-gray-300">·</span>
              <span className="text-gray-500">Longest wait: <strong>{stats.oldest_wait_time}m</strong></span>
            </>
          )}
        </section>
      )}

      {loading ? (
        <LoadingState message="Loading consultation queue..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No patients waiting"
          description="All patients have been seen or the queue is empty"
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
                    href={`/patients/${entry.patient_id}`}
                    className="text-base font-bold text-gray-900 hover:text-clinical-primary hover:underline"
                  >
                    {entry.patient.full_name}
                  </Link>
                  <span className="text-xs font-mono text-gray-500">{entry.patient.hospital_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getPriorityBadge(entry.priority)}`}>
                    {getPriorityLabel(entry.priority)}
                  </span>
                  <span className={`text-xs font-mono ${getWaitColor(getWaitMinutes(entry.entered_queue_at))}`}>
                    {getWaitMinutes(entry.entered_queue_at)}m wait
                  </span>
                </div>
                {entry.chief_complaint && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Chief Complaint:</span> {entry.chief_complaint}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleStartConsultation(entry)}
                disabled={startingId === entry.id}
                className="px-5 py-2.5 bg-clinical-primary text-white text-sm font-bold rounded hover:bg-clinical-primary-hover transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {startingId === entry.id ? "Starting..." : "Start Consultation"}
              </button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
