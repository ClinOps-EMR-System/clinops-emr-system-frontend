"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
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
import { DollarSign, Search, Receipt, AlertTriangle, CheckCircle } from "lucide-react";

interface Bill {
  id: number;
  bill_number: string;
  patient_id: number;
  encounter_id: number | null;
  total_amount: number;
  paid_amount: number;
  balance: number;
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
}

interface Service {
  id: number;
  name: string;
  category: string;
  unit_price: number;
}

type StatusFilter = "all" | "unpaid" | "partially_paid" | "paid" | "waived";

const FILTER_TABS: Array<[StatusFilter, string]> = [
  ["all", "All"],
  ["unpaid", "Unpaid"],
  ["partially_paid", "Partial"],
  ["paid", "Paid"],
  ["waived", "Waived"],
];

function getStatusVariant(status: string): "success" | "warning" | "error" | "info" | "neutral" {
  const s = status?.toLowerCase();
  if (s === "paid") return "success";
  if (s === "partially_paid") return "warning";
  if (s === "unpaid") return "error";
  if (s === "waived") return "info";
  return "neutral";
}

export default function BillingPage() {
  const { token } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_method: "cash", reference: "" });
  const [processing, setProcessing] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
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

  const filteredBills = bills.filter((b) => {
    const matchesSearch = !searchQuery ||
      b.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.patient?.hospital_number?.includes(searchQuery) ||
      b.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.payment_status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: bills.length,
    unpaid: bills.filter((b) => b.payment_status?.toLowerCase() === "unpaid").length,
    partially_paid: bills.filter((b) => b.payment_status?.toLowerCase() === "partially_paid").length,
    paid: bills.filter((b) => b.payment_status?.toLowerCase() === "paid").length,
    waived: bills.filter((b) => b.payment_status?.toLowerCase() === "waived").length,
  };

  const totalOutstanding = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
  const unpaidCount = counts.unpaid + counts.partially_paid;
  const paidToday = bills.filter((b) => {
    const today = new Date().toISOString().split("T")[0];
    return b.payment_status?.toLowerCase() === "paid" && b.created_at?.startsWith(today);
  }).length;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;
    setProcessing(true);
    try {
      await api.post(`/bills/${selectedBill.id}/payments`, {
        amount_paid: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference || null,
      }, token);
      setPaymentModalOpen(false);
      setSelectedBill(null);
      setPaymentForm({ amount: "", payment_method: "cash", reference: "" });
      fetchData();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 404) {
        setError("Billing module is not yet configured on the backend. Payments cannot be recorded at this time.");
      } else {
        setError(apiError.message || "Failed to record payment");
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
                      )}>
                        {bill.payment_status?.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {(bill.payment_status?.toLowerCase() === "unpaid" || bill.payment_status?.toLowerCase() === "partially_paid") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setSelectedBill(bill);
                              setPaymentForm({ amount: String(bill.balance || 0), payment_method: "cash", reference: "" });
                              setPaymentModalOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        )}
                        <Link
                          href={`/patients/${bill.patient_id}`}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          View
                        </Link>
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
        onClose={() => { setPaymentModalOpen(false); setSelectedBill(null); }}
        title="Record Payment"
        subtitle={selectedBill ? `Bill ${selectedBill.bill_number} — Balance: MK ${selectedBill.balance?.toLocaleString()}` : ""}
        footer={
          <>
            <button onClick={() => { setPaymentModalOpen(false); setSelectedBill(null); }} className="px-4 py-2 text-sm font-semibold text-muted-foreground bg-background border border-border rounded-lg hover:bg-muted">
              Cancel
            </button>
            <button onClick={handleRecordPayment} disabled={processing || !paymentForm.amount} className="px-4 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {processing ? "Processing..." : "Record Payment"}
            </button>
          </>
        }
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Amount (MK) *</label>
            <input
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
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Payment Method *</label>
            <select
              className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={paymentForm.payment_method}
              onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="insurance">Insurance</option>
              <option value="card">Card</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Reference Number</label>
            <input
              type="text"
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={paymentForm.reference}
              onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              placeholder="Transaction/receipt reference"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
