"use client";

import { useEffect, useState } from "react";
import { ScanLine, RefreshCw, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { useImagingRequests } from "@/hooks/useImagingRequests";
import type { ImagingRequest, ImagingResult } from "@/types/imaging";
import ImagingRequestModal from "./ImagingRequestModal";
import ImagingViewerModal from "./ImagingViewerModal";

interface ImagingPanelProps {
  encounterId: number | null;
  token: string | null;
  refreshSignal?: number;
}

function PriorityBadge({ priority }: { priority: string }) {
  const variant =
    priority === "Stat" ? "error" : priority === "Urgent" ? "warning" : "info";
  return <StatusBadge label={priority} variant={variant} size="sm" />;
}

function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase();
  const variant =
    normalized === "completed" || normalized === "released"
      ? "success"
      : normalized === "requested"
      ? "warning"
      : "info";
  return <StatusBadge label={status} variant={variant} size="sm" />;
}

export default function ImagingPanel({ encounterId, token, refreshSignal }: ImagingPanelProps) {
  const { requests, loading, error, refetch } = useImagingRequests(encounterId, token, encounterId !== null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [activeResult, setActiveResult] = useState<ImagingResult | null>(null);
  const [activeMeta, setActiveMeta] = useState<{ imaging_type: string; body_site: string | null } | null>(null);

  useEffect(() => {
    if (refreshSignal) void refetch();
  }, [refreshSignal, refetch]);

  const openViewer = (request: ImagingRequest) => {
    if (!request.result) return;
    setActiveResult(request.result);
    setActiveMeta({ imaging_type: request.imaging_type, body_site: request.body_site });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <ScanLine className="h-4 w-4" /> Radiology &amp; Imaging
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Scan requests and released reports for this encounter
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch} disabled={loading || !encounterId}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setRequestModalOpen(true)} disabled={!encounterId}>
            <ScanLine className="h-3.5 w-3.5 mr-1" /> Request Radiography
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 mb-3">{error}</div>
        )}
        {loading && requests.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ScanLine className="h-6 w-6 text-muted-foreground" />}
            title="No imaging requests yet"
            description="Request radiography to send scans to the radiographer worklist."
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
            {requests.map((request) => {
              const result = request.result;
              return (
                <div key={request.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-sm capitalize">
                          {request.imaging_type}
                          {request.body_site ? ` — ${request.body_site}` : ""}
                        </span>
                        <PriorityBadge priority={request.priority} />
                        <StatusPill status={result ? `Report ${result.status}` : request.status} />
                        {result?.is_critical && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
                      </div>
                      {request.clinical_indication && (
                        <p className="text-xs text-muted-foreground mt-1">{request.clinical_indication}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {request.requested_by?.name ?? "Clinician"} ·{" "}
                        {new Date(request.created_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    {result && (
                      <Button variant="outline" size="sm" className="shrink-0" onClick={() => openViewer(request)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {result.image_url ? "View Image & Report" : "View Report"}
                      </Button>
                    )}
                  </div>
                  {result && (
                    <p className="mt-2 text-sm text-foreground/80 italic border-l-2 border-muted pl-3">
                      {result.impression}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <ImagingRequestModal
        open={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        encounterId={encounterId}
        token={token}
        onCreated={refetch}
      />
      <ImagingViewerModal
        result={activeResult}
        imagingType={activeMeta?.imaging_type ?? null}
        bodySite={activeMeta?.body_site ?? null}
        onClose={() => {
          setActiveResult(null);
          setActiveMeta(null);
        }}
      />
    </Card>
  );
}
