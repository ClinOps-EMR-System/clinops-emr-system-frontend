"use client";

import { useFetch } from "../../../lib/useFetch";
import Link from "next/link";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import { AlertTriangle, Clock } from "lucide-react";

interface EmergencyWaitingPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  arrived_at: string;
  wait_minutes: number;
}

function getWaitColor(minutes: number): string {
  if (minutes >= 30) return "text-red-600 font-bold";
  if (minutes >= 15) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

export default function EmergencyQueuePage() {
  const { data: waitingData, loading } = useFetch<{ data: EmergencyWaitingPatient[] }>("/emergency/waiting", { interval: 15000 });
  const waiting = waitingData?.data ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section>
        <span className="text-xs font-bold text-red-600 tracking-widest uppercase">Emergency</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Emergency Triage Queue</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Patients awaiting emergency triage assessment</p>
      </section>

      {loading ? (
        <LoadingState message="Loading emergency queue..." />
      ) : waiting.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="h-6 w-6 text-gray-400" />}
          title="No patients waiting"
          description="No emergency patients are currently awaiting triage."
        />
      ) : (
        <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center">
            <div className="w-1.5 h-6 bg-red-500 rounded-full mr-3"></div>
            <h2 className="text-lg font-bold text-gray-900">Awaiting Triage</h2>
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
              {waiting.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider hidden lg:table-cell">Chief Complaint</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Arrived</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Wait Time</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {waiting.map((patient) => (
                  <tr key={patient.patient_id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        <Link href={`/patients/${patient.patient_id}`} className="hover:text-red-600 hover:underline">
                          {patient.full_name}
                        </Link>
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{patient.hospital_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate hidden lg:table-cell">{patient.chief_complaint || "—"}</td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                      {new Date(patient.arrived_at).toLocaleTimeString("en-MW", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className={`text-xs font-mono ${getWaitColor(patient.wait_minutes)}`}>
                          {patient.wait_minutes}m
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/patients/${patient.patient_id}/emergency-triage`}
                        className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider"
                      >
                        Start Triage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
