"use client";

interface QueueStatsBarProps {
  waitingCount: number;
  inConsultationCount: number;
  completedCount: number;
  oldestWaitTime?: string;
}

export function QueueStatsBar({ waitingCount, inConsultationCount, completedCount, oldestWaitTime }: QueueStatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded border border-[#becab7]/50 p-4">
        <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Waiting</p>
        <p className="text-3xl font-extrabold text-amber-600 font-mono mt-1">{waitingCount}</p>
      </div>
      <div className="bg-white rounded border border-[#becab7]/50 p-4">
        <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">In Consultation</p>
        <p className="text-3xl font-extrabold text-sky-600 font-mono mt-1">{inConsultationCount}</p>
      </div>
      <div className="bg-white rounded border border-[#becab7]/50 p-4">
        <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Completed Today</p>
        <p className="text-3xl font-extrabold text-emerald-600 font-mono mt-1">{completedCount}</p>
      </div>
      <div className="bg-white rounded border border-[#becab7]/50 p-4">
        <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Longest Wait</p>
        <p className="text-3xl font-extrabold text-red-600 font-mono mt-1">{oldestWaitTime || "—"}</p>
      </div>
    </div>
  );
}
