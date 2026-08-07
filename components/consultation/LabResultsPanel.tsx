"use client";

import { useEffect } from "react";
import { FlaskConical, RefreshCw, TriangleAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useLabResults } from "@/hooks/useLabResults";
import type { LabResult } from "@/types/lab";

interface LabResultsPanelProps {
  encounterId: number | null;
  token: string | null;
  pendingCount: number;
  refreshSignal?: number;
}

function ResultRow({ result }: { result: LabResult }) {
  const value =
    result.result_value_numeric != null
      ? String(result.result_value_numeric)
      : result.result_value_text ?? "-";

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{result.lab_request?.test_name ?? "Lab result"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {result.released_at
            ? `Released ${formatDistanceToNow(new Date(result.released_at))} ago${result.released_by?.name ? ` · by ${result.released_by.name}` : ""}`
            : "Released"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {result.reference_range && (
          <span className="text-xs text-muted-foreground font-mono">({result.reference_range})</span>
        )}
        <span
          className={cn(
            "font-mono text-sm font-bold",
            result.is_critical && "text-red-600",
            result.is_abnormal && !result.is_critical && "text-amber-600"
          )}
        >
          {value}{result.unit ? ` ${result.unit}` : ""}
        </span>
        {result.is_critical && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
        {result.is_abnormal && !result.is_critical && <Badge variant="secondary" className="text-[10px] text-amber-700">Abnormal</Badge>}
      </div>
    </div>
  );
}

export default function LabResultsPanel({ encounterId, token, pendingCount, refreshSignal }: LabResultsPanelProps) {
  const { results, loading, error, refetch } = useLabResults(encounterId, token, encounterId !== null);

  useEffect(() => {
    if (refreshSignal) void refetch(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [refreshSignal, refetch]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <FlaskConical className="h-4 w-4" /> Laboratory Results
          </CardTitle>
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} test{pendingCount === 1 ? "" : "s"} still in progress
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={refetch} disabled={loading || !encounterId}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" /> {error}
          </div>
        )}
        {loading && results.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            title="No results released yet"
            description="Released results will appear here once the lab completes them."
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
            {results.map((r) => <ResultRow key={r.id} result={r} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
