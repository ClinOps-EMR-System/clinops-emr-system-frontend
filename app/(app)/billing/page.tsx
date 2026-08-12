"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { usePageTitle } from "@/lib/hooks/usePageTitle";
import { useRealtime } from "@/store/RealtimeContext";
import { api } from "@/lib/api";
import { adminApi } from "@/lib/services/admin";
import type { PayChanguChargeResult, PayChanguOperator } from "@/lib/services/admin";
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
import { cn } from "@/lib/utils";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { getPaymentMethodError } from "@/lib/billing/payments";
import { DollarSign, Search, Receipt, AlertTriangle, CheckCircle, ShieldCheck } from "lucide-react";

interface Bill {
  id: number;
  bill_number: string;
  patient_id: number;
  encounter_id: number | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
  waived_amount?: number;
  waiver_approved?: boolean;
  waiver_approved_by?: number | null;
  waiver_reason?: string | null;
  payment_status: string;
  insurance_provider: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  encounter?: {
    encounter_type: string;
  } | null;
  items: BillItem[];
  payments: Payment[];
}

interface BillItem {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  source_type?: string | null;
}

interface Payment {
  id: number;
  payment_number: string;
  amount_paid: number;
  payment_method: string;
  payment_reference: string | null;
  created_at: string;
  status?: string;
  received_by?: { id: number; name: string } | null;
}

interface Service {
  id: number;
  name: string;
  category: string;
  unit_price: number;
}

type StatusFilter = "all" | "unpaid" | "partially_paid" | "partially_waived" | "paid" | "waived";

const FILTER_TABS: Array<[StatusFilter, string]> = [
  ["all", "All"],
  ["unpaid", "Unpaid"],
  ["partially_paid", "Partial"],
  ["partially_waived", "Part. Waived"],
  ["paid", "Paid"],
  ["waived", "Waived"],
];

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
  const s = status?.toLowerCase();
  if (s === "paid") return "success";
  if (s === "partially_paid") return "warning";
  if (s === "unpaid") return "error";
  if (s === "waived" || s === "partially_waived") return "info";
  return "neutral";
}

function statusKey(status: string): string {
  return status?.toLowerCase().replaceAll(" ", "_") || "";
}

const PAYCHANGU_POLL_INTERVAL_MS = 5000;
const PAYCHANGU_POLL_LIMIT_MS = 2 * 60 * 1000;

export default function BillingPage() {
  usePageTitle("Billing");
  const { token } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const { subscribe } = useRealtime();
  const [bills, setBills] = useState<Bill[]>([]);
  const [, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsBill, setDetailsBill] = useState<Bill | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", reference: "" });
  const [processing, setProcessing] = useState(false);
  const [waiveModalOpen, setWaiveModalOpen] = useState(false);
  const [waiveBill, setWaiveBill] = useState<Bill | null>(null);
  const [waiveForm, setWaiveForm] = useState({ amount: "", reason: "" });
  const [waiveError, setWaiveError] = useState<string | null>(null);
  const [waiving, setWaiving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [paychanguOperators, setPaychanguOperators] = useState<PayChanguOperator[]>([]);
  const [paychanguOperatorsLoading, setPaychanguOperatorsLoading] = useState(false);
  const [paychanguOperatorError, setPaychanguOperatorError] = useState<string | null>(null);
  const [paychanguMobile, setPaychanguMobile] = useState("");
  const [paychanguOperatorRef, setPaychanguOperatorRef] = useState("");
  const [paychanguCharge, setPaychanguCharge] = useState<PayChanguChargeResult | null>(null);
  const [paychanguPolling, setPaychanguPolling] = useState(false);
  const [paychanguError, setPaychanguError] = useState<string | null>(null);
  const paychanguBillIdRef = useRef<number | null>(null);

  async function fetchData(silent = false) {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const [billsRes, servicesRes] = await Promise.allSettled([
        api.get("/bills", token),
        api.get("/services", token),
      ]);
      if (billsRes.status === "fulfilled" && billsRes.value?.data) {
        setBills(billsRes.value.data);
      }
      if (servicesRes.status === "fulfilled" && servicesRes.value?.data) {
        setServices(servicesRes.value.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load billing data");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) fetchData();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!token) return;
    const off = subscribe("clinops_billing_invoices", () => {
      void fetchData(true);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token]);

  const resetPaymentForm = () => {
    setPaymentForm({ amount: "", payment_method: "cash", reference: "" });
  };

  const resetPayChanguState = () => {
    paychanguBillIdRef.current = null;
    setPaychanguCharge(null);
    setPaychanguPolling(false);
    setPaychanguError(null);
    setPaychanguOperatorsLoading(false);
    setPaychanguOperatorError(null);
    setPaychanguMobile("");
    setPaychanguOperatorRef("");
  };

  const loadPayChanguOperators = async () => {
    setPaychanguOperatorsLoading(true);
    setPaychanguOperatorError(null);
    try {
      const res = await adminApi.getPayChanguOperators(token);
      setPaychanguOperators(res.operators ?? []);
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      setPaychanguOperators([]);
      setPaychanguOperatorError(
        apiError.status === 404
          ? "PayChangu is not configured on the backend."
          : apiError.message || "Unable to load PayChangu operators."
      );
    } finally {
      setPaychanguOperatorsLoading(false);
    }
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentForm((prev) => ({ ...prev, payment_method: method }));
    if (method === "paychangu") {
      if (paychanguOperators.length === 0 && !paychanguOperatorsLoading && !paychanguOperatorError) {
        loadPayChanguOperators();
      }
    } else {
      resetPayChanguState();
    }
  };

  const handleOpenPaymentModal = (bill: Bill) => {
    setSuccessMsg(null);
    setSelectedBill(bill);
    setPaymentForm({ amount: String(bill.balance || 0), payment_method: "cash", reference: "" });
    resetPayChanguState();
    setPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    resetPayChanguState();
    setPaymentModalOpen(false);
    setSelectedBill(null);
  };

  const handleOpenDetailsModal = (bill: Bill) => {
    setDetailsBill(bill);
    setDetailsModalOpen(true);
  };

  const handleCloseDetailsModal = () => {
    setDetailsModalOpen(false);
    setDetailsBill(null);
  };

  const handleOpenWaiveModal = (bill: Bill) => {
    setWaiveError(null);
    setWaiveBill(bill);
    setWaiveForm({ amount: "", reason: "" });
    setWaiveModalOpen(true);
  };

  const handleCloseWaiveModal = () => {
    if (waiving) return;
    setWaiveModalOpen(false);
    setWaiveBill(null);
    setWaiveForm({ amount: "", reason: "" });
    setWaiveError(null);
  };

  const handleSubmitWaive = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (!waiveBill) return;
    if (!waiveForm.reason.trim()) {
      setWaiveError("A reason is required to waive a bill.");
      return;
    }
    setWaiving(true);
    setWaiveError(null);
    try {
      const body: { reason: string; amount?: number } = { reason: waiveForm.reason.trim() };
      if (waiveForm.amount) body.amount = parseFloat(waiveForm.amount);
      await api.post(`/bills/${waiveBill.id}/waive`, body, token);
      setWaiveModalOpen(false);
      setWaiveBill(null);
      setWaiveForm({ amount: "", reason: "" });
      toast.success("Bill waived successfully. Admins, finance, and clinical staff have been notified in realtime.");
      fetchData();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      const firstError = apiError.errors ? Object.values(apiError.errors)[0]?.[0] : undefined;
      setWaiveError(firstError || apiError.message || "Failed to waive the bill.");
    } finally {
      setWaiving(false);
    }
  };

  const handlePayChanguRetry = () => {
    setPaychanguError(null);
    setPaychanguPolling(true);
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const billId = paychanguBillIdRef.current;
    if (!paychanguCharge || !paychanguPolling || !token || !billId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= PAYCHANGU_POLL_LIMIT_MS) {
        setPaychanguPolling(false);
        setPaychanguError("Payment is still pending on the patient's phone. You can close this dialog; the payment will still be confirmed automatically if completed.");
        return;
      }
      try {
        const result = await adminApi.verifyPayChanguPayment(token, billId, paychanguCharge.charge_id);
        if (cancelled) return;
        if (result.status === "completed") {
          setPaychanguPolling(false);
          setPaychanguCharge(null);
          setPaymentModalOpen(false);
          setSelectedBill(null);
          resetPaymentForm();
          setSuccessMsg("PayChangu payment completed successfully.");
          fetchData();
          return;
        }
        timer = setTimeout(poll, PAYCHANGU_POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setPaychanguPolling(false);
        setPaychanguError("Unable to check the payment status. The payment will still be confirmed by webhook if the patient completes it.");
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paychanguCharge, paychanguPolling, token]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const filteredBills = bills.filter((b) => {
    const matchesSearch = !searchQuery ||
      b.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.patient?.hospital_number?.includes(searchQuery) ||
      b.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || statusKey(b.payment_status) === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: bills.length,
    unpaid: bills.filter((b) => statusKey(b.payment_status) === "unpaid").length,
    partially_paid: bills.filter((b) => statusKey(b.payment_status) === "partially_paid").length,
    partially_waived: bills.filter((b) => statusKey(b.payment_status) === "partially_waived").length,
    paid: bills.filter((b) => statusKey(b.payment_status) === "paid").length,
    waived: bills.filter((b) => statusKey(b.payment_status) === "waived").length,
  };

  const totalOutstanding = bills.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);
  const unpaidCount = counts.unpaid + counts.partially_paid + counts.partially_waived;
  const paidToday = bills.filter((b) => {
    const today = new Date().toISOString().split("T")[0];
    return statusKey(b.payment_status) === "paid" && b.created_at?.startsWith(today);
  }).length;

  const isSubmitDisabled =
    processing ||
    paychanguCharge !== null ||
    !paymentForm.amount ||
    (paymentForm.payment_method === "paychangu" &&
      (paychanguOperators.length === 0 ||
        paychanguOperatorError !== null ||
        !paychanguOperatorRef ||
        !paychanguMobile));

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    setProcessing(true);
    try {
      if (paymentForm.payment_method === "paychangu") {
        paychanguBillIdRef.current = selectedBill.id;
        const charge = await adminApi.initializePayChanguPayment(token, selectedBill.id, {
          mobile: paychanguMobile,
          operator_ref_id: paychanguOperatorRef,
          amount: parseFloat(paymentForm.amount),
        });
        setPaychanguCharge(charge);
        setPaychanguPolling(true);
        setPaychanguError(null);
      } else {
        await api.post(`/bills/${selectedBill.id}/payments`, {
          amount_paid: parseFloat(paymentForm.amount),
          payment_method: paymentForm.payment_method,
          reference: paymentForm.reference || null,
        }, token);
        setPaymentModalOpen(false);
        setSelectedBill(null);
        resetPaymentForm();
        fetchData();
      }
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (paymentForm.payment_method === "paychangu") {
        if (apiError.status === 422) {
          const errors = (err as { errors?: Record<string, string[]> }).errors;
          const firstMessage = errors ? Object.values(errors)[0]?.[0] : undefined;
          setPaychanguError(firstMessage || "Invalid payment details. Please check the mobile number and operator.");
        } else if (apiError.status === 502) {
          setPaychanguError("Unable to initialize payment with PayChangu.");
        } else if (apiError.status === 404) {
          setError("Billing module is not yet configured on the backend. Payments cannot be recorded at this time.");
        } else {
          setPaychanguError(apiError.message || "Failed to initialize PayChangu payment.");
        }
      } else if (apiError.status === 404) {
        setError("Billing module is not yet configured on the backend. Payments cannot be recorded at this time.");
      } else {
        const methodError = getPaymentMethodError(err);
        if (methodError) {
          setError(methodError);
        } else {
          setError(apiError.message || "Failed to record payment");
        }
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
            Finance
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Billing & Payments
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage patient bills, process payments, and track outstanding balances
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-bold text-foreground font-mono">MK {totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unpaid Bills</p>
            <p className="text-2xl font-bold text-foreground font-mono">{loading ? "..." : unpaidCount}</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid Today</p>
            <p className="text-2xl font-bold text-foreground font-mono">{loading ? "..." : paidToday}</p>
          </div>
        </div>
      </section>

      {/* Status Tabs */}
      <section
        role="tablist"
        aria-label="Bill status filter"
        className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1"
      >
        {FILTER_TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={statusFilter === key}
            onClick={() => setStatusFilter(key)}
            className={cn(
              "flex-shrink-0 rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all",
              statusFilter === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by bill #, patient name, or hospital #..."
          aria-label="Search bills"
          className="w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Patient Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="flex flex-col gap-3 px-(--card-spacing) py-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-(--card-spacing) py-8 text-center text-sm text-destructive">{error}</div>
          ) : filteredBills.length === 0 ? (
            <div className="px-(--card-spacing) py-12 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-40" />
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? "No bills match your filters" : "No bills have been created yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden md:table-cell">Paid</TableHead>
                  <TableHead className="hidden md:table-cell">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {bill.bill_number}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {bill.patient ? `${bill.patient.first_name} ${bill.patient.last_name}` : `Patient #${bill.patient_id}`}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {bill.patient?.hospital_number}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {bill.encounter?.encounter_type || "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium">
                      MK {bill.total_amount?.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs text-emerald-600">
                      MK {bill.paid_amount?.toLocaleString()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs font-medium text-red-600">
                      MK {bill.balance?.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                        bill.payment_status?.toLowerCase() === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                        bill.payment_status?.toLowerCase() === "unpaid" && "bg-red-50 text-red-700 border border-red-200",
                        bill.payment_status?.toLowerCase() === "partially_paid" && "bg-amber-50 text-amber-700 border border-amber-200",
                        bill.payment_status?.toLowerCase() === "waived" && "bg-sky-50 text-sky-700 border border-sky-200",
                        bill.payment_status?.toLowerCase() === "partially_waived" && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                      )}>
                        {bill.payment_status?.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {can("billing.create") && (statusKey(bill.payment_status) === "unpaid" || statusKey(bill.payment_status) === "partially_paid") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleOpenPaymentModal(bill)}
                          >
                            Pay
                          </Button>
                        )}
                        {can("billing.waiver") &&
                          (statusKey(bill.payment_status) === "unpaid" ||
                            statusKey(bill.payment_status) === "partially_paid" ||
                            statusKey(bill.payment_status) === "partially_waived") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            onClick={() => handleOpenWaiveModal(bill)}
                          >
                            Waive
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleOpenDetailsModal(bill)}
                        >
                          View Details
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={handleClosePaymentModal}
        title="Record Payment"
        subtitle={selectedBill ? `Bill ${selectedBill.bill_number} — Balance: MK ${selectedBill.balance?.toLocaleString()}` : ""}
        footer={
          paychanguCharge && paychanguError ? (
            <>
              <button onClick={handleClosePaymentModal} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted">
                Close
              </button>
              <button onClick={handlePayChanguRetry} className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90">
                Retry
              </button>
            </>
          ) : (
            <>
              <button onClick={handleClosePaymentModal} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted">
                Cancel
              </button>
              <button onClick={handleRecordPayment} disabled={isSubmitDisabled} className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
                {processing || paychanguCharge ? "Processing..." : "Record Payment"}
              </button>
            </>
          )
        }
      >
        {paychanguCharge ? (
          <div className="space-y-4">
            {paychanguError ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Payment still pending</p>
                <p className="mt-1">{paychanguError}</p>
                <p className="mt-2 text-xs text-amber-700">
                  The payment will still be confirmed automatically if the patient completes it.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Awaiting payment confirmation</p>
                <p className="mt-1">Ask the patient to complete the payment using the prompt on their phone.</p>
              </div>
            )}
            <div className="space-y-2 rounded-lg border border-input p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Operator</span>
                <span className="font-medium">{paychanguCharge.operator}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Mobile</span>
                <span className="font-medium font-mono">{paychanguCharge.mobile}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium font-mono">MK {Number(paychanguCharge.amount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Transaction</span>
                <span className="font-medium font-mono">{paychanguCharge.trans_id}</span>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {paymentForm.payment_method === "paychangu" && paychanguError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                {paychanguError}
              </div>
            )}
            <div>
              <label htmlFor="field-billing-amount" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Amount (MK) *</label>
              <input
                id="field-billing-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedBill?.balance}
                required
                className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="field-billing-method" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Payment Method *</label>
              <select
                id="field-billing-method"
                className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                value={paymentForm.payment_method}
                onChange={(e) => handlePaymentMethodChange(e.target.value)}
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="paychangu">Mobile Money (PayChangu)</option>
                <option value="insurance">Insurance</option>
                <option value="card">Card</option>
              </select>
            </div>
            {paymentForm.payment_method === "paychangu" ? (
              <>
                <div>
                  <label htmlFor="field-billing-operator" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Operator *</label>
                  {paychanguOperatorsLoading ? (
                    <div className="text-sm text-muted-foreground">Loading operators...</div>
                  ) : paychanguOperatorError ? (
                    <div className="text-xs text-destructive">{paychanguOperatorError}</div>
                  ) : paychanguOperators.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No mobile money operators are available.</div>
                  ) : (
                    <select
                      id="field-billing-operator"
                      className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={paychanguOperatorRef}
                      onChange={(e) => setPaychanguOperatorRef(e.target.value)}
                      required
                    >
                      <option value="">Select operator</option>
                      {paychanguOperators.map((op) => (
                        <option key={op.id} value={op.ref_id}>{op.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="field-billing-mobile" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Mobile Number *</label>
                  <input
                    id="field-billing-mobile"
                    type="tel"
                    className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    value={paychanguMobile}
                    onChange={(e) => setPaychanguMobile(e.target.value)}
                    placeholder="e.g. +2659..."
                    required
                  />
                </div>
              </>
            ) : (
              <div>
                <label htmlFor="field-billing-reference" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Reference Number</label>
                <input
                  id="field-billing-reference"
                  type="text"
                  className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  placeholder="Transaction/receipt reference"
                />
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Bill Details Modal */}
      <Modal
        open={detailsModalOpen}
        onClose={handleCloseDetailsModal}
        title="Bill Details"
        subtitle={
          detailsBill
            ? `${detailsBill.bill_number} — ${detailsBill.patient ? `${detailsBill.patient.first_name} ${detailsBill.patient.last_name}` : `Patient #${detailsBill.patient_id}`}`
            : ""
        }
        size="lg"
        footer={
          <button
            onClick={handleCloseDetailsModal}
            className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted"
          >
            Close
          </button>
        }
      >
        {detailsBill && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">
                  {detailsBill.patient
                    ? `${detailsBill.patient.first_name} ${detailsBill.patient.last_name}`
                    : `Patient #${detailsBill.patient_id}`}
                </div>
                <div className="font-mono text-xs text-muted-foreground">
                  {detailsBill.patient?.hospital_number}
                </div>
              </div>
              <Link
                href={`/patients/${detailsBill.patient_id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Open patient record
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>Type: {detailsBill.encounter?.encounter_type || "—"}</span>
              <span>Created: {detailsBill.created_at ? new Date(detailsBill.created_at).toLocaleDateString() : "—"}</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailsBill.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-foreground">{item.item_name}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right font-mono text-xs">MK {Number(item.unit_price).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-mono text-xs">MK {Number(item.total).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-medium font-mono">MK {Number(detailsBill.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium font-mono text-emerald-600">MK {Number(detailsBill.paid_amount).toLocaleString()}</span>
              </div>
              {Number(detailsBill.waived_amount) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Waived</span>
                  <span className="font-medium font-mono text-sky-600">MK {Number(detailsBill.waived_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Balance</span>
                <span className="font-medium font-mono text-red-600">MK {Number(detailsBill.balance).toLocaleString()}</span>
              </div>
              {detailsBill.waiver_reason && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 uppercase tracking-wider">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Waiver
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{detailsBill.waiver_reason}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Waive Bill Modal */}
      <Modal
        open={waiveModalOpen}
        onClose={handleCloseWaiveModal}
        title="Waive Bill"
        subtitle={
          waiveBill
            ? `${waiveBill.bill_number} — Balance: MK ${waiveBill.balance?.toLocaleString()}`
            : ""
        }
        footer={
          <>
            <button
              onClick={handleCloseWaiveModal}
              disabled={waiving}
              className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitWaive}
              disabled={waiving}
              className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {waiving ? "Waiving..." : "Confirm Waiver"}
            </button>
          </>
        }
      >
        {waiveBill && (
          <form onSubmit={handleSubmitWaive} className="space-y-4">
            {waiveError && (
              <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
                {waiveError}
              </div>
            )}
            <div>
              <label htmlFor="field-waive-amount" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Amount (MK)</label>
              <input
                id="field-waive-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={waiveBill.balance}
                className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                value={waiveForm.amount}
                onChange={(e) => setWaiveForm({ ...waiveForm, amount: e.target.value })}
                placeholder={`Leave empty to waive full balance (MK ${Number(waiveBill.balance).toLocaleString()})`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave empty to waive the full outstanding balance.
              </p>
            </div>
            <div>
              <label htmlFor="field-waive-reason" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Reason *</label>
              <textarea
                id="field-waive-reason"
                required
                maxLength={500}
                rows={3}
                className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                value={waiveForm.reason}
                onChange={(e) => setWaiveForm({ ...waiveForm, reason: e.target.value })}
                placeholder="e.g. Hardship case approved by facility administrator"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
