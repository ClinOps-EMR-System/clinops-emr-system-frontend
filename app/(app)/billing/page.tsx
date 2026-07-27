"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import { PaymentStatusBadge } from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import Modal from "../../../components/ui/Modal";
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
  payment_method: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  notes: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  items?: BillItem[];
}

interface BillItem {
  id: number;
  service_id: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Service {
  id: number;
  name: string;
  category: string;
  unit_price: number;
}

export default function BillingPage() {
  const { token } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
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

  const totalOutstanding = bills.reduce((sum, b) => sum + (b.balance || 0), 0);
  const unpaidCount = bills.filter((b) => b.payment_status === "unpaid" || b.payment_status === "partially_paid").length;
  const paidToday = bills.filter((b) => {
    const today = new Date().toISOString().split("T")[0];
    return b.payment_status === "paid" && b.created_at?.startsWith(today);
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
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Finance</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Billing & Payments</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">Manage patient bills, process payments, and track outstanding balances</p>
        </div>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Outstanding</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">MK {totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Unpaid Bills</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : unpaidCount}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Paid Today</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : paidToday}</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by bill #, patient name, or hospital #..."
              aria-label="Search bills"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-clinical-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
            <option value="paid">Paid</option>
            <option value="waived">Waived</option>
          </select>
        </div>
      </section>

      {/* Bills Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Patient Bills</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading billing data..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="h-6 w-6 text-gray-400" />}
            title="No bills found"
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No bills have been created yet"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Bill #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Paid</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Balance</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono font-bold text-gray-900">{bill.bill_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {bill.patient ? `${bill.patient.first_name} ${bill.patient.last_name}` : `Patient #${bill.patient_id}`}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{bill.patient?.hospital_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold font-mono text-gray-900">MK {bill.total_amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-mono text-emerald-700">MK {bill.paid_amount?.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-red-700">MK {bill.balance?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={bill.payment_status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {(bill.payment_status === "unpaid" || bill.payment_status === "partially_paid") && (
                          <button
                            onClick={() => { setSelectedBill(bill); setPaymentForm({ amount: String(bill.balance || 0), payment_method: "cash", reference: "" }); setPaymentModalOpen(true); }}
                            className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider cursor-pointer"
                          >
                            Record Payment
                          </button>
                        )}
                        <Link href={`/patients/${bill.patient_id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Record Payment Modal */}
      <Modal
        open={paymentModalOpen}
        onClose={() => { setPaymentModalOpen(false); setSelectedBill(null); }}
        title="Record Payment"
        subtitle={selectedBill ? `Bill ${selectedBill.bill_number} — Balance: MK ${selectedBill.balance?.toLocaleString()}` : ""}
        footer={
          <>
            <button onClick={() => { setPaymentModalOpen(false); setSelectedBill(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleRecordPayment} disabled={processing || !paymentForm.amount} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
              {processing ? "Processing..." : "Record Payment"}
            </button>
          </>
        }
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Amount (MK) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedBill?.balance}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary font-mono"
              value={paymentForm.amount}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Payment Method *</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary"
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
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Reference Number</label>
            <input
              type="text"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
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
