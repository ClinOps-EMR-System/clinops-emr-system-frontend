"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { useRealtime } from "../../../store/RealtimeContext";
import { api } from "../../../lib/api";
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
import { cn } from "../../../lib/utils";
import { FlaskConical, Search, Clock, AlertTriangle, Plus, RefreshCw } from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { usePermissions } from "@/lib/hooks/usePermissions";
import LabResultForm from "../../../components/lab/LabResultForm";
import type { LabResultValue } from "@/types/lab";

interface LabOrder {
  id: number;
  patient_id: number;
  encounter_id: number;
  order_type: string;
  clinical_indication: string | null;
  priority: string;
  status: string;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  lab_request?: {
    id: number;
    test_name: string;
    loinc_code: string | null;
    lab_test_id: number | null;
    specimen_type: string | null;
    status: string;
  };
}

interface LabResult {
  id: number;
  lab_request_id: number;
  result_value_text: string | null;
  result_value_numeric: number | null;
  unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean;
  is_critical: boolean;
  status: string;
  verified_by: number | null;
  verified_at: string | null;
  released_by: number | null;
  released_at: string | null;
  created_at: string;
  lab_request?: {
    id: number;
    test_name: string;
    loinc_code: string | null;
    patient_id: number;
    patient?: {
      first_name: string;
      last_name: string;
      hospital_number: string;
    };
    encounter?: {
      id: number;
      patient_id: number;
      patient?: {
        first_name: string;
        last_name: string;
        hospital_number: string;
      };
    };
  };
}

interface Service {
  id: number;
  name: string;
  category: string;
  unit_price: number | string;
}

export default function LabPage() {
  const { token, user } = useAuth();
  const { subscribe } = useRealtime();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<"pending" | "results" | "verified">("pending");
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultForm, setResultForm] = useState({ result_value_text: "", result_value_numeric: "", unit: "", reference_range: "", interpretation: "", is_abnormal: false, is_critical: false, billable_price: "" });
  const [componentValues, setComponentValues] = useState<LabResultValue[]>([]);
  const [resultMetadata, setResultMetadata] = useState<{ specimen_quality?: string; clinical_comment?: string; interpretation?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [ordersRes, resultsRes, servicesRes] = await Promise.all([
        api.get("/orders", token),
        api.get("/lab-results", token),
        api.get("/services?category=Lab&per_page=100", token),
      ]);
      if (ordersRes && ordersRes.data) {
        const allOrders = ordersRes.data.data || ordersRes.data;
        const labOrders = (Array.isArray(allOrders) ? allOrders : []).filter(
          (o: LabOrder) => o.order_type?.toLowerCase() === "lab"
        );
        setOrders(labOrders);
      }
      if (resultsRes && resultsRes.data) {
        const allResults = resultsRes.data.data || resultsRes.data;
        setResults(Array.isArray(allResults) ? allResults : []);
      }
      if (servicesRes && servicesRes.data) {
        const allServices = servicesRes.data.data || servicesRes.data;
        setServices(Array.isArray(allServices) ? allServices : []);
      }
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lab data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) fetchData();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!token) return;
    const offRequests = subscribe("clinops_lab_requests", () => {
      void fetchData(true);
    });
    const offResults = subscribe("clinops_lab_results", () => {
      void fetchData(true);
    });
    return () => {
      offRequests();
      offResults();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.lab_request?.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.patient?.hospital_number?.includes(searchQuery) ||
      o.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "pending" || o.status?.toLowerCase() === "ordered");
  const inProgressOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "in_progress" || o.status?.toLowerCase() === "collected");
  const enteredResults = results.filter((r) => r.status === "entered" && !r.verified_at);
  const completedResults = results.filter((r) => r.verified_at || r.released_at);

  const handleOpenResultModal = (order: LabOrder) => {
    const testName = order.lab_request?.test_name?.toLowerCase();
    const match = testName
      ? services.find((s) => s.name.toLowerCase() === testName)
      : undefined;
    setSelectedOrder(order);
    setResultForm((prev) => ({
      ...prev,
      billable_price: match ? String(match.unit_price) : "",
    }));
    setComponentValues([]);
    setResultMetadata({});
    setSubmitError(null);
    setSubmitSuccess(null);
    setResultModalOpen(true);
  };

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSubmitError(null);
    setSubmitSuccess(null);
    const labRequestId = selectedOrder.lab_request?.id;
    if (!labRequestId) {
      setSubmitError("No lab request found for this order. Create a lab request first.");
      return;
    }
    setSubmitting(true);
    try {
      const hasComponents = componentValues.length > 0;
      const payload: Record<string, unknown> = {
        lab_request_id: labRequestId,
        billable_price: parseFloat(resultForm.billable_price),
      };

      if (hasComponents) {
        // New-style component-based result
        payload.component_values = componentValues;
        payload.specimen_quality = resultMetadata.specimen_quality || null;
        payload.clinical_comment = resultMetadata.clinical_comment || null;
        payload.interpretation = resultMetadata.interpretation || null;
      } else {
        // Legacy single-value result
        payload.unit = resultForm.unit || null;
        payload.reference_range = resultForm.reference_range || null;
        payload.is_abnormal = resultForm.is_abnormal;
        payload.is_critical = resultForm.is_critical;
        if (resultForm.result_value_numeric && !isNaN(parseFloat(resultForm.result_value_numeric))) {
          payload.result_value_numeric = parseFloat(resultForm.result_value_numeric);
        } else {
          payload.result_value_text = resultForm.result_value_text;
        }
      }

      await api.post("/lab-results", payload, token);
      const isStudent = user?.roles?.includes("Medical Student") ?? false;
      setSubmitSuccess(
        isStudent
          ? "Result submitted successfully. It will appear under Results Entry until verified."
          : "Result submitted successfully and released to the clinical team."
      );
      setResultForm({ result_value_text: "", result_value_numeric: "", unit: "", reference_range: "", interpretation: "", is_abnormal: false, is_critical: false, billable_price: "" });
      setComponentValues([]);
      setResultMetadata({});
      fetchData();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit result");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["lab technician", "doctor", "clinical officer", "medical student", "admin"]}>
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Laboratory</span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lab Orders & Results</h1>
          <p className="text-sm text-muted-foreground">Process orders, enter results, and verify reports</p>
          {lastUpdated && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {can("lab.order") && (
          <Button nativeButton={false} render={<Link href="/lab/request" />}>
            <Plus data-icon="inline-start" />
            New Lab Request
          </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : pendingOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </CardTitle>
            <FlaskConical className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : inProgressOrders.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Critical Results
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : results.filter((r) => r.is_critical && !r.released_at).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-card rounded-xl p-1 ring-1 ring-foreground/10" role="tablist" aria-label="Lab orders views">
        {[
          { key: "pending" as const, label: "Pending Orders", count: pendingOrders.length },
          { key: "results" as const, label: "Results Entry", count: enteredResults.length + inProgressOrders.length },
          { key: "verified" as const, label: "Verified Results", count: completedResults.length },
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
              placeholder="Search by test name, patient name, or hospital #..."
              aria-label="Search lab orders"
              className="w-full pl-9 pr-4 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab === "pending" ? "Pending Lab Orders" : activeTab === "results" ? "Results Entry" : "Verified Results"}
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
                  <TableHead>Test</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab === "pending" && (
                  pendingOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState icon={<FlaskConical className="h-6 w-6 text-muted-foreground" />} title="No pending orders" description="All lab orders have been processed" />
                      </TableCell>
                    </TableRow>
                  ) : pendingOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : `Patient #${order.patient_id}`}
                        {order.patient?.hospital_number && (
                          <div className="text-xs text-muted-foreground font-mono">{order.patient.hospital_number}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{order.lab_request?.test_name || "—"}</div>
                        {order.lab_request?.loinc_code && <div className="text-xs text-muted-foreground font-mono">LOINC: {order.lab_request.loinc_code}</div>}
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={order.priority} variant={order.priority?.toLowerCase() === "stat" ? "error" : order.priority?.toLowerCase() === "urgent" ? "warning" : "info"} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge label={order.status} variant="warning" pulse />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {can("lab.view_results") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenResultModal(order)}
                          >
                            <Plus className="h-3 w-3" />
                            Enter Result
                          </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            nativeButton={false}
                            render={<Link href={`/patients/${order.patient_id}`} />}
                          >
                            Profile
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}

                {activeTab === "results" && (
                  enteredResults.length === 0 && inProgressOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState title="No results pending entry" description="Entered results will appear here awaiting verification" />
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {enteredResults.map((result) => (
                        <TableRow key={`result-${result.id}`} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {result.lab_request?.encounter?.patient
                              ? `${result.lab_request.encounter.patient.first_name} ${result.lab_request.encounter.patient.last_name}`
                              : result.lab_request?.patient
                                ? `${result.lab_request.patient.first_name} ${result.lab_request.patient.last_name}`
                                : `Patient #${result.lab_request?.encounter?.patient_id ?? result.lab_request?.patient_id ?? "—"}`}
                            {result.lab_request?.encounter?.patient?.hospital_number && (
                              <div className="text-xs text-muted-foreground font-mono">{result.lab_request.encounter.patient.hospital_number}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            <div>{result.lab_request?.test_name || "—"}</div>
                            {result.lab_request?.loinc_code && <div className="text-xs text-muted-foreground font-mono">LOINC: {result.lab_request.loinc_code}</div>}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm font-medium">{result.result_value_numeric ?? result.result_value_text ?? "—"}</span>
                            {result.unit && <span className="text-xs text-muted-foreground ml-1">{result.unit}</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <StatusBadge label="Entered" variant="warning" pulse />
                              {result.is_abnormal && <StatusBadge label="Abnormal" variant="warning" className="ml-1" />}
                              {result.is_critical && <StatusBadge label="Critical" variant="error" pulse className="ml-1" />}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button size="sm" variant="ghost" disabled>
                              Awaiting Verify
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {inProgressOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : `Patient #${order.patient_id}`}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{order.lab_request?.test_name || "—"}</TableCell>
                          <TableCell><StatusBadge label={order.priority} variant="info" /></TableCell>
                          <TableCell><StatusBadge label={order.status} variant="info" /></TableCell>
                          <TableCell>
                            {can("lab.view_results") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenResultModal(order)}
                            >
                              Enter Result
                            </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )
                )}

                {activeTab === "verified" && (
                  completedResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <EmptyState title="No verified results" description="Results will appear here after verification or release" />
                      </TableCell>
                    </TableRow>
                  ) : completedResults.map((result) => (
                    <TableRow key={result.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        {result.lab_request?.encounter?.patient
                          ? `${result.lab_request.encounter.patient.first_name} ${result.lab_request.encounter.patient.last_name}`
                          : result.lab_request?.patient
                            ? `${result.lab_request.patient.first_name} ${result.lab_request.patient.last_name}`
                            : `Patient #${result.lab_request?.encounter?.patient_id ?? result.lab_request?.patient_id ?? "—"}`}
                        {result.lab_request?.encounter?.patient?.hospital_number && (
                          <div className="text-xs text-muted-foreground font-mono">{result.lab_request.encounter.patient.hospital_number}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{result.lab_request?.test_name}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm font-medium">{result.result_value_numeric ?? result.result_value_text ?? "—"}</span>
                        {result.unit && <span className="text-xs text-muted-foreground ml-1">{result.unit}</span>}
                        {result.is_abnormal && <StatusBadge label="Abnormal" variant="warning" className="ml-2" />}
                        {result.is_critical && <StatusBadge label="Critical" variant="error" pulse className="ml-2" />}
                      </TableCell>
                      <TableCell><StatusBadge label={result.status === "released" ? "Released" : "Verified"} variant="success" /></TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          nativeButton={false}
                          render={<Link href={`/patients/${result.lab_request?.patient_id}`} />}
                        >
                          Profile
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

      {/* Enter Result Modal */}
      <Modal
        open={resultModalOpen}
        onClose={() => { setResultModalOpen(false); setSelectedOrder(null); setSubmitError(null); setSubmitSuccess(null); }}
        title="Enter Lab Result"
        subtitle={selectedOrder ? `${selectedOrder.lab_request?.test_name || "Lab Test"} for ${selectedOrder.patient ? `${selectedOrder.patient.first_name} ${selectedOrder.patient.last_name}` : `Patient #${selectedOrder.patient_id}`}` : ""}
        size="lg"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => { setResultModalOpen(false); setSelectedOrder(null); setSubmitError(null); setSubmitSuccess(null); }}
              >
                {submitSuccess ? "Close" : "Cancel"}
              </Button>
              {!submitSuccess && can("lab.view_results") && (
                <Button
                  onClick={handleSubmitResult}
                  disabled={submitting || resultForm.billable_price === ""}
                >
                  {submitting ? "Submitting..." : "Submit Result"}
                </Button>
              )}
            </>
          }
      >
        <form onSubmit={handleSubmitResult} className="space-y-4">
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

          {/* Dynamic catalog-driven result form */}
          {selectedOrder?.lab_request?.lab_test_id ? (
            <LabResultForm
              labTestId={selectedOrder.lab_request.lab_test_id}
              onValuesChange={setComponentValues}
              onMetadataChange={setResultMetadata}
            />
          ) : (
            /* Legacy single-value form */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Numeric Result</label>
                  <input
                    type="number"
                    step="any"
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                    value={resultForm.result_value_numeric}
                    onChange={(e) => setResultForm({ ...resultForm, result_value_numeric: e.target.value })}
                    placeholder="e.g., 12.5, 120"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Text Result</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                    value={resultForm.result_value_text}
                    onChange={(e) => setResultForm({ ...resultForm, result_value_text: e.target.value })}
                    placeholder="e.g., Positive, 120/80"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                    value={resultForm.unit}
                    onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                    placeholder="e.g., g/dL, mmol/L"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reference Range</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                    value={resultForm.reference_range}
                    onChange={(e) => setResultForm({ ...resultForm, reference_range: e.target.value })}
                    placeholder="e.g., 12.0-16.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Interpretation</label>
                  <input
                    type="text"
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                    value={resultForm.interpretation}
                    onChange={(e) => setResultForm({ ...resultForm, interpretation: e.target.value })}
                    placeholder="Clinical interpretation"
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={resultForm.is_abnormal}
                    onChange={(e) => setResultForm({ ...resultForm, is_abnormal: e.target.checked })}
                    className="rounded border-input text-clinical-primary focus:ring-clinical-primary"
                  />
                  <span className="font-medium text-foreground">Abnormal Result</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={resultForm.is_critical}
                    onChange={(e) => setResultForm({ ...resultForm, is_critical: e.target.checked })}
                    className="rounded border-input text-red-600 focus:ring-red-500"
                  />
                  <span className="font-medium text-foreground">Critical Result</span>
                </label>
              </div>
              {resultForm.is_critical && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 font-medium">
                  Critical results require immediate clinician notification and acknowledgment workflow.
                </div>
              )}
            </>
          )}

          {/* Billable Price (always shown) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Billable Price (MK) <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary font-mono"
              value={resultForm.billable_price}
              onChange={(e) => setResultForm({ ...resultForm, billable_price: e.target.value })}
              placeholder="e.g., 3500"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This amount is added to the patient&apos;s bill when the result is submitted.
            </p>
          </div>
        </form>
      </Modal>
    </div>
    </RoleGuard>
  );
}