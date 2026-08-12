"use client";

import { QueuePatientCard } from "./QueuePatientCard";

interface QueueEntry {
  id?: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  priority: number;
  entered_queue_at: string;
  status: string;
}

interface QueueSectionProps {
  title: string;
  entries: QueueEntry[];
  color: "red" | "amber" | "green";
}

const colorMap = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
};

export function QueueSection({ title, entries, color }: QueueSectionProps) {
  if (entries.length === 0) return null;

  return (
    <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${colorMap[color]}`}></div>
        <h3 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-xs font-mono text-gray-500">({entries.length})</span>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.map((entry) => (
          <QueuePatientCard key={entry.patient.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
