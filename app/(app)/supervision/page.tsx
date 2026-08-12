"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import StatusBadge from "@/components/ui/StatusBadge";
import { Pill, ShieldCheck, TriangleAlert } from "lucide-react";

interface ReviewItem {
  id: number;
  type: "consultation" | "prescription";
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
  encounter_id: number | null;
  chief_complaint: string | null;
  drug: { id: number; name: string; strength: string | null } | null;
  prescription_status: string | null;
  patient: { id: number; hospital_number: string; full_name: string } | null;
  student: { id: number; name: string } | null;
}

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Sent Back" },
  { key: "all", label: "All" },
] as const;

export default function SupervisionPage() {
  const { token } = useAuth();
  const { can } = usePermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("status") || "pending") as (typeof TABS)[number]["key"];
  const { notifications } = useRealtimeNotifications();

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/supervisor/verification-requests?status=${activeTab}`, token);
      setItems(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, token]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (token) void fetchItems();
  }, [token, fetchItems, notifications]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!can("supervisor.review")) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <span className="font-semibold">You do not have permission to review student work.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Supervision"
        description="Verify student consultations and prescriptions submitted by your supervisees."
      />

      <div className="flex gap-2 border-b">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => router.push(`/supervision?status=${tab.key}`)}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-red-600" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            No {activeTab === "all" ? "" : activeTab} reviews to show.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => router.push(`/supervision/${item.id}`)}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {item.type === "prescription" && <Pill className="h-4 w-4 text-muted-foreground" />}
                  <p className="font-semibold text-sm truncate">
                    {item.patient?.full_name ?? "Unknown patient"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  #{item.patient?.hospital_number ?? "—"} · {item.student?.name ?? "Unknown"} ·{" "}
                  {new Date(item.submitted_at).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {item.type === "prescription"
                    ? `${item.drug?.name ?? "Medication"} · ${item.prescription_status ?? "—"}`
                    : (item.chief_complaint ?? "")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge
                  label={item.type === "prescription" ? "Rx" : "Consultation"}
                  variant={item.type === "prescription" ? "purple" : "neutral"}
                />
                <StatusBadge
                  label={item.status}
                  variant={item.status === "pending" ? "warning" : item.status === "approved" ? "success" : "error"}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
