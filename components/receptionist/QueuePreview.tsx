"use client";

import Link from "next/link";

interface QueuePatient {
  id?: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  priority: number;
  entered_queue_at: string;
}

function getWaitTime(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

function getWaitColor(enteredAt: string): string {
  const diff = Date.now() - new Date(enteredAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins > 30) return "text-red-600";
  if (mins > 10) return "text-amber-600";
  return "text-emerald-600";
}

function getPriorityColor(priority: number): string {
  if (priority <= 2) return "bg-red-100 text-red-800 border-red-200";
  if (priority <= 3) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function getPriorityLabel(priority: number): string {
  if (priority <= 2) return "HIGH";
  if (priority <= 3) return "MED";
  return "LOW";
}

export function QueuePreview({ queue }: { queue: QueuePatient[] }) {
  if (!queue || queue.length === 0) {
    return (
      <div className="bg-white rounded border border-[#becab7]/50 p-6">
        <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider mb-3">Next in Queue</h3>
        <p className="text-sm text-gray-400">No patients waiting</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Next in Queue</h3>
        </div>
        <Link href="/triage-queue" className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider">
          View All
        </Link>
      </div>
      <div className="divide-y divide-gray-100">
        {queue.slice(0, 5).map((entry) => (
          <div key={entry.patient.id} className="px-6 py-3 flex items-center justify-between hover:bg-[#fcf9f8]/40 transition-colors">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold border ${getPriorityColor(entry.priority)}`}>
                {getPriorityLabel(entry.priority)}
              </span>
              <div>
                <Link href={`/patients/${entry.patient.id}`} className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline">
                  {entry.patient.first_name} {entry.patient.last_name}
                </Link>
                <p className="text-xs text-gray-400 font-mono">{entry.patient.hospital_number}</p>
              </div>
            </div>
            <span className={`text-xs font-mono font-semibold ${getWaitColor(entry.entered_queue_at)}`}>
              {getWaitTime(entry.entered_queue_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
