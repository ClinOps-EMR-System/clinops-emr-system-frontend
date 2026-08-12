"use client";

import { useFetch } from "@/lib/useFetch";
import { useRealtime } from "@/lib/hooks/useRealtime";
import { QueueStatsBar } from "@/components/queue/QueueStatsBar";
import { QueueSection } from "@/components/queue/QueueSection";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import { ListOrdered } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface QueueEntry {
  id?: number;
  encounter_id: number;
  patient: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  priority: number;
  position: number;
  status: string;
  entered_queue_at: string;
  started_at: string | null;
  completed_at: string | null;
}

interface QueueStats {
  waiting_count: number;
  in_consultation_count: number;
  completed_count: number;
  oldest_wait_time: string;
}

interface QueueResponse {
  entries: QueueEntry[];
  meta: {
    waiting_count: number;
    by_priority: Record<string, number>;
    oldest_wait_time: string;
  };
}

export default function QueuePage() {
  usePageTitle("Queue");
  const { data: queueData, loading: queueLoading, refetch: refetchQueue } = useFetch<QueueResponse>("/queue", { interval: 30000 });
  const { data: stats, loading: statsLoading, refetch: refetchStats } = useFetch<QueueStats>("/queue/stats", { interval: 30000 });

  useRealtime(["clinops_consultation_queue"], {
    onEvent: () => {
      refetchQueue();
      refetchStats();
    },
  });

  const loading = queueLoading || statsLoading;
  const entries = queueData?.entries ?? [];

  const waiting = entries.filter((e) => e.status === "waiting");
  const highPriority = waiting.filter((e) => e.priority <= 2);
  const medPriority = waiting.filter((e) => e.priority === 3);
  const lowPriority = waiting.filter((e) => e.priority >= 4);

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Operations</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Patient Queue</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">
          Real-time view of patients in the clinical queue
        </p>
      </section>

      {/* Stats */}
      <QueueStatsBar
        waitingCount={stats?.waiting_count ?? waiting.length}
        inConsultationCount={stats?.in_consultation_count ?? 0}
        completedCount={stats?.completed_count ?? 0}
        oldestWaitTime={stats?.oldest_wait_time}
      />

      {/* Queue Sections */}
      {loading ? (
        <LoadingState message="Loading queue..." />
      ) : waiting.length === 0 ? (
        <EmptyState
          icon={<ListOrdered className="h-6 w-6 text-gray-500" />}
          title="No patients in queue"
          description="All patients have been seen or none are waiting"
        />
      ) : (
        <div className="space-y-4">
          <QueueSection title="High Priority" entries={highPriority} color="red" />
          <QueueSection title="Medium Priority" entries={medPriority} color="amber" />
          <QueueSection title="Low Priority" entries={lowPriority} color="green" />
        </div>
      )}
    </div>
  );
}
