"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFetch } from "@/lib/useFetch";
import EmptyState from "@/components/ui/EmptyState";
import LoadingState from "@/components/ui/LoadingState";
import { AlertTriangle, Clock } from "lucide-react";

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
  appointment_type: string;
}

interface TriageEntry {
  id: string;
  patient_id: number;
  encounter_id: number | null;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  wait_minutes: number;
  priority: number;
  source: "emergency" | "appointment";
}

type CategoryFilter = "all" | "high" | "medium" | "low";

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function getPriorityLabel(priority: number): string {
  if (priority === 1) return "L1 - RED (IMMEDIATE)";
  if (priority === 2) return "L2 - ORANGE (VERY URGENT)";
  if (priority === 3) return "L3 - YELLOW (URGENT)";
  if (priority === 4) return "L4 - GREEN (STANDARD)";
  return "L5 - BLUE (NON-URGENT)";
}

function getEwsBadgeStyle(priority: number): string {
  if (priority === 1) return "bg-red-600 text-white border-red-700 font-bold animate-pulse";
  if (priority === 2) return "bg-orange-500 text-white border-orange-600 font-bold";
  if (priority === 3) return "bg-amber-400 text-amber-950 border-amber-500 font-semibold";
  if (priority === 4) return "bg-emerald-500 text-white border-emerald-600";
  return "bg-blue-500 text-white border-blue-600";
}

function getRowBorder(priority: number): string {
  if (priority === 1) return "border-l-4 border-l-red-600 bg-red-50/20";
  if (priority === 2) return "border-l-4 border-l-orange-500 bg-orange-50/20";
  if (priority === 3) return "border-l-4 border-l-amber-400";
  if (priority === 4) return "border-l-4 border-l-emerald-500";
  return "border-l-4 border-l-blue-500";
}

function getSourceBadge(source: "emergency" | "appointment"): string {
  return source === "emergency"
    ? "bg-red-100 text-red-700 border-red-300 font-extrabold"
    : "bg-sky-100 text-sky-700 border-sky-200";
}

export default function TriageQueuePage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [now] = useState(() => Date.now());

  const today = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const { data: emergencyRaw, loading: emergLoading } = useFetch<EmergencyPatient[]>(
    "/emergency/waiting", { interval: 20000 }
  );
  const { data: appointmentsRaw, loading: apptLoading } = useFetch<CheckedInAppointment[]>(
    `/appointments?date=${today}&status=Checked-in`, { interval: 20000 }
  );

  const loading = emergLoading || apptLoading;

  const entries: TriageEntry[] = useMemo(() => {
    const result: TriageEntry[] = [];

    const emergencyPatients = emergencyRaw ?? [];
    for (const ep of emergencyPatients) {
      const waitMinutes = ep.wait_minutes ?? Math.round((now - new Date(ep.arrived_at).getTime()) / 60000);
      result.push({
        id: `emergency-${ep.patient_id}`,
        patient_id: ep.patient_id,
        encounter_id: null,
        hospital_number: ep.hospital_number,
        full_name: ep.full_name,
        chief_complaint: ep.chief_complaint || "",
        wait_minutes: waitMinutes,
        priority: ep.severity_level || 2, // Default ER walk-in to L2 (Orange/Urgent) unless specified
        source: "emergency",
      });
    }

    if (appointmentsRaw) {
      for (const ap of appointmentsRaw) {
        const waitMinutes = Math.round((now - new Date(ap.scheduled_for).getTime()) / 60000);
        result.push({
          id: `appt-${ap.id}`,
          patient_id: ap.patient.id,
          encounter_id: ap.encounter_id ?? null,
          hospital_number: ap.patient.hospital_number,
          full_name: `${ap.patient.first_name} ${ap.patient.last_name}`,
          chief_complaint: ap.reason || "",
          wait_minutes: Math.max(0, waitMinutes),
          priority: 4, // Regular appointments default to L4 Green
          source: "appointment",
        });
      }
    }

    return result;
  }, [emergencyRaw, appointmentsRaw, now]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.wait_minutes - a.wait_minutes;
    });
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (categoryFilter === "all") return sortedEntries;
    if (categoryFilter === "high") return sortedEntries.filter((e) => e.priority <= 2);
    if (categoryFilter === "medium") return sortedEntries.filter((e) => e.priority === 3);
    return sortedEntries.filter((e) => e.priority >= 4);
  }, [sortedEntries, categoryFilter]);

  const highCount = entries.filter((e) => e.priority <= 2).length;
  const medCount = entries.filter((e) => e.priority === 3).length;
  const lowCount = entries.filter((e) => e.priority >= 4).length;
  const oldestWait = entries.length > 0 ? Math.max(...entries.map((e) => e.wait_minutes)) : 0;
  const emergCount = entries.filter((e) => e.source === "emergency").length;

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
              className={`px-3 py-2 text-xs font-bold rounded transition-colors min-h-[40px] ${
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
          {entries.length} patient{entries.length !== 1 ? "s" : ""} waiting for triage
        </span>
        {emergCount > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {emergCount} emergency
            </span>
          </>
        )}
        <span className="text-gray-300">·</span>
        <span className="text-red-600 font-semibold">{highCount} high priority</span>
        <span className="text-gray-300">·</span>
        <span className="text-amber-600 font-semibold">{medCount} medium</span>
        <span className="text-gray-300">·</span>
        <span className="text-emerald-600 font-semibold">{lowCount} low</span>
        {oldestWait > 0 && (
          <>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Longest wait: <strong>{oldestWait}m</strong>
            </span>
          </>
        )}
      </section>

      {/* Queue Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Waiting List</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading triage queue..." />
        ) : filteredEntries.length === 0 ? (
          <EmptyState
            title="No patients waiting for triage"
            description="Check reception for new arrivals or register a new patient"
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider hidden md:table-cell">Source</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Priority</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider hidden lg:table-cell">Chief Complaint</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Time Waiting</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
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
                        {entry.full_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                      {entry.hospital_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-bold ${getSourceBadge(entry.source)}`}>
                        {entry.source === "emergency" ? "ER" : "Appt"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded border text-sm font-extrabold font-mono ${getEwsBadgeStyle(entry.priority)}`}
                      >
                        {getPriorityLabel(entry.priority)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">
                      {entry.chief_complaint || "—"}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs font-mono ${getWaitColor(entry.wait_minutes)}`}>
                      {entry.wait_minutes}m
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={
                          entry.source === "emergency"
                            ? `/patients/${entry.patient_id}/emergency-triage`
                            : `/patients/${entry.patient_id}/triage`
                        }
                        className={`text-xs font-bold uppercase tracking-wider ${
                          entry.source === "emergency"
                            ? "text-red-600 hover:text-red-800"
                            : "text-clinical-primary hover:text-clinical-primary-hover"
                        }`}
                      >
                        {entry.source === "emergency" ? "Rapid Triage" : "Start Triage"}
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
