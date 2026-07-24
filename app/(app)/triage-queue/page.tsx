"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";

interface TriageEntry {
  id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
    gender: string;
  };
  encounter_id: number;
  ews_score: number;
  triage_color: string;
  chief_complaint: string;
  recorded_at: string;
  minutes_since_registration: number;
}

type CategoryFilter = "all" | "high" | "medium" | "low";

function getEwsBadgeStyle(score: number): string {
  if (score >= 7) return "bg-red-100 text-red-800 border-red-200";
  if (score >= 5) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function getTriageColorVariant(color: string): "error" | "warning" | "success" {
  const c = color?.toLowerCase();
  if (c === "red" || c === "high" || c === "1") return "error";
  if (c === "amber" || c === "yellow" || c === "medium" || c === "2") return "warning";
  return "success";
}

function formatMinutesAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m ago` : `${hours}h ago`;
}

export default function TriageQueuePage() {
  const { token } = useAuth();
  const [entries, setEntries] = useState<TriageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  useEffect(() => {
    async function fetchQueue() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/queue", token);
        if (res && res.data) {
          setEntries(res.data);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load triage queue");
      } finally {
        setLoading(false);
      }
    }

    if (token) fetchQueue();
  }, [token]);

  const filteredEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.ews_score - a.ews_score);
    if (categoryFilter === "all") return sorted;
    if (categoryFilter === "high") return sorted.filter((e) => e.ews_score >= 7);
    if (categoryFilter === "medium") return sorted.filter((e) => e.ews_score >= 5 && e.ews_score < 7);
    return sorted.filter((e) => e.ews_score < 5);
  }, [entries, categoryFilter]);

  const highCount = entries.filter((e) => e.ews_score >= 7).length;
  const medCount = entries.filter((e) => e.ews_score >= 5 && e.ews_score < 7).length;
  const lowCount = entries.filter((e) => e.ews_score < 5).length;

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
      <section className="flex items-center gap-4 text-sm font-mono">
        <span className="text-gray-500">
          {filteredEntries.length} patient{filteredEntries.length !== 1 ? "s" : ""} in queue
        </span>
        <span className="text-gray-300">·</span>
        <span className="text-red-600 font-semibold">{highCount} high priority</span>
        <span className="text-gray-300">·</span>
        <span className="text-amber-600 font-semibold">{medCount} medium</span>
        <span className="text-gray-300">·</span>
        <span className="text-emerald-600 font-semibold">{lowCount} low</span>
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
            description="All patients have been triaged or none match the selected filter"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8]">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">EWS Score</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Triage Category</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Chief Complaint</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Time Waiting</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-[#fcf9f8]/40 hover:border-l-4 hover:border-brand-green/80 transition-all divide-x divide-gray-100"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/patients/${entry.patient.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline"
                      >
                        {entry.patient.first_name} {entry.patient.last_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {entry.patient.hospital_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded border text-sm font-extrabold font-mono ${getEwsBadgeStyle(entry.ews_score)}`}
                      >
                        {entry.ews_score}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        label={entry.triage_color?.toUpperCase() || "UNKNOWN"}
                        variant={getTriageColorVariant(entry.triage_color)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {entry.chief_complaint || "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {formatMinutesAgo(entry.minutes_since_registration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/patients/${entry.patient.id}/triage`}
                        className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
                      >
                        Triage
                      </Link>
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
