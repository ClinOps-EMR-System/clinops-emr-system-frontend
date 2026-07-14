"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";

interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  gender: string;
  patient_category: string;
  created_at: string;
  registration_completed_at: string | null;
}

export default function TriageQueuePage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const response = await api.get("/patients?per_page=20", token);
        if (response?.data) setPatients(response.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchPatients();
  }, [token]);

  const checkedIn = patients.filter((p) => p.registration_completed_at && p.patient_category === "Emergency");
  const waiting = patients.filter((p) => p.registration_completed_at && p.patient_category !== "Emergency");
  const drafts = patients.filter((p) => !p.registration_completed_at);

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      <div>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Triage</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Triage Queue</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Prioritise and assess patients based on clinical urgency.</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-gray-500 font-mono">Loading triage queue...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded border border-red-200 overflow-hidden">
            <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-red-800">Emergency</h2>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{drafts.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {drafts.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No emergency cases</p>
              ) : (
                drafts.map((p) => (
                  <Link key={p.id} href={`/patients/${p.id}/triage`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.hospital_number}</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 uppercase">Triage</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded border border-amber-200 overflow-hidden">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-amber-800">Waiting</h2>
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">{waiting.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {waiting.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No waiting patients</p>
              ) : (
                waiting.map((p) => (
                  <Link key={p.id} href={`/patients/${p.id}/triage`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.hospital_number}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600 uppercase">Triage</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded border border-green-200 overflow-hidden">
            <div className="px-4 py-3 bg-green-50 border-b border-green-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-green-800">Checked In</h2>
              <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">{checkedIn.length}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {checkedIn.length === 0 ? (
                <p className="p-4 text-sm text-gray-400">No checked-in patients</p>
              ) : (
                checkedIn.map((p) => (
                  <Link key={p.id} href={`/patients/${p.id}/triage`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{p.hospital_number}</p>
                    </div>
                    <span className="text-xs font-bold text-green-600 uppercase">View</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
