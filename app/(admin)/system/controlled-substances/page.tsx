"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../../store/RoleContext";
import { adminApi } from "../../../../lib/services/admin";
import { SectionHeader } from "../../../../components/ui/PageLayout";
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
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import SelectField from "../../../../components/ui/SelectField";
import Modal from "../../../../components/ui/Modal";
import {
  Pill,
  AlertTriangle,
  Search,
  FileText,
  RefreshCw,
  Download,
  Eye,
} from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import type { ControlledSubstanceLog, PaginationMeta } from "@/types/admin";

type Tab = "audit" | "discrepancies" | "reconciliation";

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "dispensed", label: "Dispensed" },
  { value: "wasted", label: "Wasted" },
  { value: "destroyed", label: "Destroyed" },
  { value: "received", label: "Received" },
  { value: "reconciled", label: "Reconciled" },
  { value: "prescribed", label: "Prescribed" },
  { value: "verified", label: "Verified" },
];

export default function ControlledSubstancesPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("audit");

  // Audit trail state
  const [logs, setLogs] = useState<ControlledSubstanceLog[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [drugSearch, setDrugSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Discrepancy state
  const [discrepancies, setDiscrepancies] = useState<ControlledSubstanceLog[]>([]);
  const [discLoading, setDiscLoading] = useState(false);

  // Reconciliation state
  const [reconcileDrugId, setReconcileDrugId] = useState("");
  const [reconcileCount, setReconcileCount] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");
  const [reconcileSaving, setReconcileSaving] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconcileSuccess, setReconcileSuccess] = useState(false);

  // Report state
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reportData, setReportData] = useState<ControlledSubstanceLog[] | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Detail modal
  const [detailLog, setDetailLog] = useState<ControlledSubstanceLog | null>(null);

  // Drug search for filtering
  const [drugOptions, setDrugOptions] = useState<{ id: number; name: string }[]>([]);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = {
        page,
        per_page: 20,
      };
      if (actionFilter) params.action = actionFilter;
      const res = await adminApi.csLogs(token, params);
      setLogs(res.data);
      setMeta(res.meta ?? null);
    } catch {
      setLogs([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [token, page, actionFilter]);

  const fetchDiscrepancies = useCallback(async () => {
    if (!token) return;
    setDiscLoading(true);
    try {
      const data = await adminApi.csDiscrepancies(token);
      setDiscrepancies(data);
    } catch {
      setDiscrepancies([]);
    } finally {
      setDiscLoading(false);
    }
  }, [token]);

  const fetchDrugs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await adminApi.listDrugs(token, { per_page: 200, is_controlled: 1 });
      setDrugOptions(res.data.map((d) => ({ id: d.id, name: d.name })));
    } catch {
      setDrugOptions([]);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (tab === "discrepancies") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDiscrepancies();
    }
  }, [tab, fetchDiscrepancies]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDrugs();
  }, [fetchDrugs]);

  const handleReconcile = async () => {
    if (!token || !reconcileDrugId || !reconcileCount || !reconcileNotes) {
      setReconcileError("All fields are required");
      return;
    }
    setReconcileSaving(true);
    setReconcileError(null);
    setReconcileSuccess(false);
    try {
      await adminApi.csReconcile(token, {
        drug_id: Number(reconcileDrugId),
        physical_count: Number(reconcileCount),
        notes: reconcileNotes,
      });
      setReconcileSuccess(true);
      setReconcileDrugId("");
      setReconcileCount("");
      setReconcileNotes("");
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setReconcileError(apiErr.message || "Reconciliation failed");
    } finally {
      setReconcileSaving(false);
    }
  };

  const handleReport = async () => {
    if (!token || !reportFrom || !reportTo) return;
    setReportLoading(true);
    try {
      const data = await adminApi.csReport(token, reportFrom, reportTo);
      setReportData(data);
    } catch {
      setReportData(null);
    } finally {
      setReportLoading(false);
    }
  };

  const filteredLogs = drugSearch
    ? logs.filter((l) =>
        l.drug?.name?.toLowerCase().includes(drugSearch.toLowerCase()) ||
        l.drug?.generic_name?.toLowerCase().includes(drugSearch.toLowerCase())
      )
    : logs;

  const getActionVariant = (action: string): "success" | "warning" | "error" | "info" | "neutral" => {
    switch (action) {
      case "dispensed": return "info";
      case "wasted": case "destroyed": return "warning";
      case "received": return "success";
      case "reconciled": return "neutral";
      case "prescribed": case "verified": return "info";
      default: return "neutral";
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof Pill }[] = [
    { key: "audit", label: "Audit Trail", icon: FileText },
    { key: "discrepancies", label: "Discrepancies", icon: AlertTriangle },
    { key: "reconciliation", label: "Reconcile", icon: RefreshCw },
  ];

  return (
    <RoleGuard allowedRoles={["pharmacist", "admin"]}>
      <div className="flex flex-col gap-6">
        <SectionHeader
          title="Controlled Substance Audit Trail"
          description="Track, audit, and reconcile controlled substance usage"
        />

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
                {t.key === "discrepancies" && discrepancies.length > 0 && (
                  <span className="ml-1 bg-destructive/10 text-destructive text-xs px-1.5 py-0.5 rounded-full font-medium">
                    {discrepancies.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Audit Trail Tab */}
        {tab === "audit" && (
          <div className="flex flex-col gap-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[160px]">
                    <SelectField
                      label="Action"
                      options={ACTION_OPTIONS}
                      value={actionFilter}
                      onChange={(e) => {
                        setActionFilter(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <div className="min-w-[200px]">
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Drug Search</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search drug name..."
                        value={drugSearch}
                        onChange={(e) => setDrugSearch(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {loading ? (
                  <div className="px-6 py-4 space-y-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div key={i} className="flex gap-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No controlled substance logs found
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead className="hidden md:table-cell">Stock Before → After</TableHead>
                          <TableHead className="hidden lg:table-cell">Performed By</TableHead>
                          <TableHead className="hidden lg:table-cell">Witnessed By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.drug?.name ?? "—"}</TableCell>
                            <TableCell>
                              <StatusBadge label={log.action} variant={getActionVariant(log.action)} />
                            </TableCell>
                            <TableCell className="tabular-nums">{log.quantity}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                              {log.stock_before != null && log.stock_after != null
                                ? `${log.stock_before} → ${log.stock_after}`
                                : "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {log.performedBy?.name ?? "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">
                              {log.witnessedBy?.name ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(log.performed_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" onClick={() => setDetailLog(log)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {meta && meta.last_page > 1 && (
                      <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">
                          Showing {(meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
                        </span>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" disabled={meta.current_page <= 1} onClick={() => setPage(meta.current_page - 1)}>
                            Previous
                          </Button>
                          <Button size="sm" variant="outline" disabled={meta.current_page >= meta.last_page} onClick={() => setPage(meta.current_page + 1)}>
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Discrepancies Tab */}
        {tab === "discrepancies" && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Stock Discrepancies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Reconciliation events where physical count differs from system count
                </p>
                {discLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : discrepancies.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No discrepancies found
                  </div>
                ) : (
                  <div className="rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug</TableHead>
                          <TableHead>System Count</TableHead>
                          <TableHead>Physical Count</TableHead>
                          <TableHead>Discrepancy</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {discrepancies.map((d) => {
                          const diff = (d.stock_after ?? 0) - (d.stock_before ?? 0);
                          return (
                            <TableRow key={d.id}>
                              <TableCell className="font-medium">{d.drug?.name ?? "—"}</TableCell>
                              <TableCell className="tabular-nums">{d.stock_before}</TableCell>
                              <TableCell className="tabular-nums">{d.stock_after}</TableCell>
                              <TableCell>
                                <span className={`font-medium tabular-nums ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : ""}`}>
                                  {diff > 0 ? `+${diff}` : diff}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{d.performedBy?.name ?? "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(d.performed_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Report Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dispensation Summary Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-end gap-3 mb-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
                    <Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
                    <Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
                  </div>
                  <Button onClick={handleReport} disabled={!reportFrom || !reportTo || reportLoading}>
                    <Download className="h-4 w-4" data-icon="inline-start" />
                    {reportLoading ? "Loading..." : "Generate Report"}
                  </Button>
                </div>
                {reportData && (
                  <div className="rounded border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Drug</TableHead>
                          <TableHead>Qty Dispensed</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Performed By</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                              No dispensation records in this date range
                            </TableCell>
                          </TableRow>
                        ) : (
                          reportData.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.drug?.name ?? "—"}</TableCell>
                              <TableCell className="tabular-nums">{r.quantity}</TableCell>
                              <TableCell className="font-mono text-sm">{r.batch_number ?? "—"}</TableCell>
                              <TableCell className="text-sm">{r.performedBy?.name ?? "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {new Date(r.performed_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reconciliation Tab */}
        {tab === "reconciliation" && (
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Record Physical Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Compare physical stock count against system records. Any discrepancy will be logged and adjusted.
                </p>
                {reconcileError && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm mb-4">
                    {reconcileError}
                  </div>
                )}
                {reconcileSuccess && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm mb-4">
                    Reconciliation recorded successfully
                  </div>
                )}
                <div className="grid gap-4 max-w-lg">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Drug *</label>
                    <SelectField
                      label=""
                      options={drugOptions.map((d) => ({ value: String(d.id), label: d.name }))}
                      value={reconcileDrugId}
                      onChange={(e) => setReconcileDrugId(e.target.value)}
                      placeholder="Select controlled substance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Physical Count *</label>
                    <Input
                      type="number"
                      min={0}
                      value={reconcileCount}
                      onChange={(e) => setReconcileCount(e.target.value)}
                      placeholder="Enter physical count"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Notes *</label>
                    <Input
                      value={reconcileNotes}
                      onChange={(e) => setReconcileNotes(e.target.value)}
                      placeholder="e.g. End-of-shift count, audit finding"
                    />
                  </div>
                  <div>
                    <Button onClick={handleReconcile} disabled={reconcileSaving}>
                      <RefreshCw className="h-4 w-4" data-icon="inline-start" />
                      {reconcileSaving ? "Recording..." : "Record Reconciliation"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detail Modal */}
        <Modal
          open={!!detailLog}
          onClose={() => setDetailLog(null)}
          title="Controlled Substance Log Detail"
          footer={
            <Button variant="outline" onClick={() => setDetailLog(null)}>Close</Button>
          }
        >
          {detailLog && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Drug</dt>
              <dd className="font-medium">{detailLog.drug?.name ?? "—"}</dd>

              <dt className="text-muted-foreground">Action</dt>
              <dd><StatusBadge label={detailLog.action} variant={getActionVariant(detailLog.action)} /></dd>

              <dt className="text-muted-foreground">Quantity</dt>
              <dd className="tabular-nums font-medium">{detailLog.quantity}</dd>

              {detailLog.batch_number && (
                <>
                  <dt className="text-muted-foreground">Batch Number</dt>
                  <dd className="font-mono">{detailLog.batch_number}</dd>
                </>
              )}

              {detailLog.stock_before != null && (
                <>
                  <dt className="text-muted-foreground">Stock Before</dt>
                  <dd className="tabular-nums">{detailLog.stock_before}</dd>
                </>
              )}

              {detailLog.stock_after != null && (
                <>
                  <dt className="text-muted-foreground">Stock After</dt>
                  <dd className="tabular-nums">{detailLog.stock_after}</dd>
                </>
              )}

              <dt className="text-muted-foreground">Patient</dt>
              <dd>
                {detailLog.patient
                  ? `${detailLog.patient.hospital_number ?? ""} ${detailLog.patient.first_name ?? ""} ${detailLog.patient.last_name ?? ""}`.trim() || "—"
                  : "—"}
              </dd>

              <dt className="text-muted-foreground">Prescription</dt>
              <dd>{detailLog.prescription?.rx_number ?? "—"}</dd>

              <dt className="text-muted-foreground">Performed By</dt>
              <dd>{detailLog.performedBy?.name ?? "—"}</dd>

              <dt className="text-muted-foreground">Witnessed By</dt>
              <dd>{detailLog.witnessedBy?.name ?? "—"}</dd>

              <dt className="text-muted-foreground">Date</dt>
              <dd>{new Date(detailLog.performed_at).toLocaleString()}</dd>

              {detailLog.justification && (
                <>
                  <dt className="text-muted-foreground">Justification</dt>
                  <dd className="col-span-2">{detailLog.justification}</dd>
                </>
              )}
            </dl>
          )}
        </Modal>
      </div>
    </RoleGuard>
  );
}
