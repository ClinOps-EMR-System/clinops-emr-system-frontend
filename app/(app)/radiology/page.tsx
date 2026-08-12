"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import { subscribe } from "../../../lib/realtime";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import ImagingUploadModal, { type ImagingUploadTarget } from "@/components/radiology/ImagingUploadModal";
import { cn } from "../../../lib/utils";
import { ScanLine, Search, Clock, AlertTriangle, RefreshCw, FileText, ImagePlus } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface ImagingRequest {
  imaging_request_id: number;
  patient: {
    id: number;
    hospital_number: string;
    full_name: string;
  };
  encounter_id: number;
  imaging_type: string;
  body_site: string | null;
  clinical_indication: string | null;
  priority: "Routine" | "Urgent" | "Stat";
  status: "Requested" | "Performed" | "Cancelled";
  requested_by: string | null;
  performed_at: string | null;
  has_draft_report: boolean;
  report_status: "Drafted" | "Released" | null;
  is_critical: boolean;
  ordered_at: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RadiologyPage() {
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<"requested" | "performed" | "released">("requested");
  const [requests, setRequests] = useState<ImagingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Report modal
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ImagingRequest | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadRequest, setUploadRequest] = useState<ImagingUploadTarget | null>(null);
  const [reportForm, setReportForm] = useState({
    technique: "",
    findings: "",
    impression: "",
    conclusion: "",
    is_critical: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false);
  const [pendingRelease, setPendingRelease] = useState<ImagingRequest | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/worklist/imaging", token);
      const data = res?.data?.data ?? res?.data ?? [];
      setRequests(Array.isArray(data) ? data : []);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load imaging worklist");
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!token) return;
    fetchData();
    const offRequests = subscribe("clinops_radiology_requests", () => {
      fetchData();
    });
    const offResults = subscribe("clinops_radiology_results", () => {
      fetchData();
    });
    return () => {
      offRequests();
      offResults();
    };
  }, [token]);

  // ── Derived lists ────────────────────────────────────────────────────────────

  const filtered = requests.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.imaging_type.toLowerCase().includes(q) ||
      r.patient.full_name.toLowerCase().includes(q) ||
      r.patient.hospital_number.includes(q) ||
      (r.body_site ?? "").toLowerCase().includes(q)
    );
  });

  const requestedList = filtered.filter((r) => r.status === "Requested");
  const performedList = filtered.filter((r) => r.status === "Performed");
  const releasedList = requests.filter((r) => r.report_status === "Released");
  const criticalPending = requests.filter((r) => r.is_critical && r.report_status !== "Released");

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const openReportModal = (req: ImagingRequest) => {
    setSelectedRequest(req);
    setReportForm({ technique: "", findings: "", impression: "", conclusion: "", is_critical: false });
    setSubmitError(null);
    setSubmitSuccess(null);
    setReportModalOpen(true);
  };

  const closeReportModal = () => {
    setReportModalOpen(false);
    setSelectedRequest(null);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const openUploadModal = (req: ImagingRequest) => {
    setUploadRequest({
      imaging_request_id: req.imaging_request_id,
      imaging_type: req.imaging_type,
      body_site: req.body_site,
      patient: req.patient,
    });
    setUploadModalOpen(true);
  };

  const handleMarkPerformed = async (req: ImagingRequest) => {
    try {
      await api.post(`/imaging-requests/${req.imaging_request_id}/perform`, {}, token);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark as performed");
    }
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    if (!reportForm.findings.trim() || !reportForm.impression.trim()) {
      setSubmitError("Findings and Impression are required.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(
        `/imaging-requests/${selectedRequest.imaging_request_id}/result`,
        {
          technique: reportForm.technique || null,
          findings: reportForm.findings,
          impression: reportForm.impression,
          conclusion: reportForm.conclusion || null,
          is_critical: reportForm.is_critical,
        },
        token
      );
      setSubmitSuccess("Report saved as draft. You can now release it.");
      fetchData();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRelease = async (req: ImagingRequest) => {
    setPendingRelease(req);
    setReleaseConfirmOpen(true);
  };

  const confirmRelease = async () => {
    if (!pendingRelease) return;
    setReleaseConfirmOpen(false);
    try {
      await api.post(`/imaging-requests/${pendingRelease.imaging_request_id}/release`, {}, token);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to release report");
    } finally {
      setPendingRelease(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Radiology</span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Imaging Worklist</h1>
          <p className="text-sm text-muted-foreground">Mark performed, draft reports, and release results to clinicians</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Scan
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : requestedList.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Report
            </CardTitle>
            <ScanLine className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : performedList.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critical Unreleased
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : criticalPending.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-card rounded-xl p-1 ring-1 ring-foreground/10" role="tablist" aria-label="Radiology worklist views">
        {[
          { key: "requested" as const, label: "Requested", count: requestedList.length },
          { key: "performed" as const, label: "Performed / Draft Report", count: performedList.length },
          { key: "released" as const, label: "Released", count: releasedList.length },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold rounded-lg transition-all min-h-[44px]",
              activeTab === tab.key
                ? "bg-clinical-primary text-white"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by imaging type, patient name, body site, or hospital #..."
              aria-label="Search imaging requests"
              className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab === "requested"
              ? "Requested — Awaiting Scan"
              : activeTab === "performed"
              ? "Performed — Awaiting Report"
              : "Released Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-28" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Imaging Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>

                {/* ── Requested tab ── */}
                {activeTab === "requested" && (
                  requestedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState
                          icon={<ScanLine className="h-6 w-6 text-muted-foreground" />}
                          title="No pending imaging requests"
                          description="New imaging requests from clinicians will appear here"
                        />
                      </TableCell>
                    </TableRow>
                  ) : requestedList.map((req) => (
                    <TableRow key={req.imaging_request_id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {req.patient.full_name}
                        <div className="text-xs text-muted-foreground font-mono">{req.patient.hospital_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{req.imaging_type}</div>
                        {req.body_site && <div className="text-xs text-muted-foreground">{req.body_site}</div>}
                        {req.clinical_indication && (
                          <div className="text-xs text-muted-foreground italic mt-0.5 max-w-xs truncate">{req.clinical_indication}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={req.priority}
                          variant={req.priority === "Stat" ? "error" : req.priority === "Urgent" ? "warning" : "info"}
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge label="Requested" variant="warning" pulse />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => openUploadModal(req)}>
                            <ImagePlus className="h-3 w-3 mr-1" />
                            Upload Results
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPerformed(req)}
                          >
                            Mark Performed
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            nativeButton={false}
                            render={<Link href={`/patients/${req.patient.id}`} />}
                          >
                            Profile
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* ── Performed tab ── */}
                {activeTab === "performed" && (
                  performedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState
                          title="No performed scans awaiting report"
                          description="Mark a scan as performed to start writing a report"
                        />
                      </TableCell>
                    </TableRow>
                  ) : performedList.map((req) => (
                    <TableRow key={req.imaging_request_id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {req.patient.full_name}
                        <div className="text-xs text-muted-foreground font-mono">{req.patient.hospital_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{req.imaging_type}</div>
                        {req.body_site && <div className="text-xs text-muted-foreground">{req.body_site}</div>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={req.priority}
                          variant={req.priority === "Stat" ? "error" : req.priority === "Urgent" ? "warning" : "info"}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <StatusBadge label="Performed" variant="info" />
                          {req.has_draft_report && (
                            <StatusBadge label="Draft saved" variant="warning" className="ml-1" />
                          )}
                          {req.is_critical && (
                            <StatusBadge label="Critical" variant="error" pulse className="ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => openUploadModal(req)}>
                            <ImagePlus className="h-3 w-3 mr-1" />
                            Upload Results
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReportModal(req)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {req.has_draft_report ? "Edit Report" : "Write Report"}
                          </Button>
                          {req.has_draft_report && (
                            <Button
                              size="sm"
                              onClick={() => handleRelease(req)}
                            >
                              Release
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {/* ── Released tab ── */}
                {activeTab === "released" && (
                  releasedList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState
                          title="No released reports"
                          description="Released imaging reports will appear here"
                        />
                      </TableCell>
                    </TableRow>
                  ) : releasedList.map((req) => (
                    <TableRow key={req.imaging_request_id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {req.patient.full_name}
                        <div className="text-xs text-muted-foreground font-mono">{req.patient.hospital_number}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{req.imaging_type}</div>
                        {req.body_site && <div className="text-xs text-muted-foreground">{req.body_site}</div>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={req.priority}
                          variant={req.priority === "Stat" ? "error" : req.priority === "Urgent" ? "warning" : "info"}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <StatusBadge label="Released" variant="success" />
                          {req.is_critical && (
                            <StatusBadge label="Critical" variant="error" pulse className="ml-1" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          nativeButton={false}
                          render={<Link href={`/patients/${req.patient.id}`} />}
                        >
                          Patient Profile
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}

              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Report Modal */}
      <Modal
        open={reportModalOpen}
        onClose={closeReportModal}
        title={selectedRequest?.has_draft_report ? "Edit Imaging Report" : "Write Imaging Report"}
        subtitle={
          selectedRequest
            ? `${selectedRequest.imaging_type}${selectedRequest.body_site ? ` — ${selectedRequest.body_site}` : ""} · ${selectedRequest.patient.full_name}`
            : ""
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={closeReportModal}>
              {submitSuccess ? "Close" : "Cancel"}
            </Button>
            {!submitSuccess && (
              <Button
                onClick={handleSaveReport}
                disabled={submitting || !reportForm.findings.trim() || !reportForm.impression.trim()}
              >
                {submitting ? "Saving..." : "Save Report Draft"}
              </Button>
            )}
          </>
        }
      >
        <form onSubmit={handleSaveReport} className="space-y-4">
          {submitSuccess && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 font-medium">
              {submitSuccess}
            </div>
          )}
          {submitError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">
              {submitError}
            </div>
          )}

          <div>
            <label htmlFor="field-radiology-technique" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Technique <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </label>
            <input
              id="field-radiology-technique"
              type="text"
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              value={reportForm.technique}
              onChange={(e) => setReportForm({ ...reportForm, technique: e.target.value })}
              placeholder="e.g. PA chest radiograph, supine"
            />
          </div>

          <div>
            <label htmlFor="field-radiology-findings" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Findings <span className="text-red-500">*</span>
            </label>
            <textarea
              id="field-radiology-findings"
              rows={4}
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
              value={reportForm.findings}
              onChange={(e) => setReportForm({ ...reportForm, findings: e.target.value })}
              placeholder="Describe the radiological findings..."
            />
          </div>

          <div>
            <label htmlFor="field-radiology-impression" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Impression <span className="text-red-500">*</span>
            </label>
            <textarea
              id="field-radiology-impression"
              rows={3}
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
              value={reportForm.impression}
              onChange={(e) => setReportForm({ ...reportForm, impression: e.target.value })}
              placeholder="Radiologist's diagnostic impression..."
            />
          </div>

          <div>
            <label htmlFor="field-radiology-conclusion" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Conclusion / Recommendation <span className="text-muted-foreground font-normal normal-case">(optional)</span>
            </label>
            <textarea
              id="field-radiology-conclusion"
              rows={2}
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
              value={reportForm.conclusion}
              onChange={(e) => setReportForm({ ...reportForm, conclusion: e.target.value })}
              placeholder="Follow-up recommendation or additional workup..."
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={reportForm.is_critical}
              onChange={(e) => setReportForm({ ...reportForm, is_critical: e.target.checked })}
              className="rounded border-input text-red-600 focus:ring-red-500"
            />
            <span className="font-medium text-foreground">Mark as Critical Finding</span>
          </label>

          {reportForm.is_critical && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 font-medium">
              ⚠️ Critical findings trigger an immediate alert to Doctors and Clinical Officers upon release.
            </div>
          )}
        </form>
      </Modal>

      <ImagingUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        request={uploadRequest}
        token={token}
        onComplete={fetchData}
      />
    </div>
  );
}
