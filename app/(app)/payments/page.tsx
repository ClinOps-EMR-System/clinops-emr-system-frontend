"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/RoleContext";
import { BillPicker } from "@/components/payments/BillPicker";
import { BillPreview } from "@/components/payments/BillPreview";
import { PaymentForm, type RecordedPayment } from "@/components/payments/PaymentForm";
import { Receipt } from "@/components/payments/Receipt";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote } from "lucide-react";
import type { BillSummary, BillDetail, ReceiptData } from "@/types/payments";
import type { PayChanguChargeResult } from "@/lib/services/admin";

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  hospital_number: string;
}

export default function PaymentsPage() {
  const { token } = useAuth();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [bills, setBills] = useState<BillSummary[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const [billDetail, setBillDetail] = useState<BillDetail | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [highlightPaymentId, setHighlightPaymentId] = useState<number | undefined>(undefined);
  const [pageError, setPageError] = useState<string | null>(null);

  async function searchPatients(query: string) {
    setPatientQuery(query);
    if (query.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(query)}`, token);
      setPatientResults(res?.data ?? []);
    } catch {
      setPatientResults([]);
    }
  }

  async function selectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setPatientResults([]);
    setPatientQuery("");
    setSelectedBillId(null);
    setBillDetail(null);
    setReceipt(null);
    setPageError(null);
    setBillsLoading(true);
    try {
      const res = await api.get(`/bills?patient_id=${patient.id}`, token);
      setBills((res?.data as BillSummary[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load bills.";
      setPageError(message);
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }

  async function selectBill(billId: number) {
    setSelectedBillId(billId);
    setBillDetail(null);
    setReceipt(null);
    setPageError(null);
    setBillLoading(true);
    try {
      const res = await api.get(`/bills/${billId}`, token);
      setBillDetail((res?.data as BillDetail) ?? null);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load bill.");
    } finally {
      setBillLoading(false);
    }
  }

  async function loadReceipt(highlightId?: number) {
    if (!selectedBillId || !token) return;
    setHighlightPaymentId(highlightId);
    setReceiptLoading(true);
    try {
      const res = await api.get(`/bills/${selectedBillId}/receipt`, token);
      setReceipt((res?.data as ReceiptData) ?? null);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load receipt.");
    } finally {
      setReceiptLoading(false);
    }
  }

  const handlePaymentRecorded = (payment: RecordedPayment) => {
    void loadReceipt(payment.id);
  };

  const handlePayChanguInitiated = (charge: PayChanguChargeResult) => {
    setPaychanguCharge(charge);
  };

  const handlePayChanguCompleted = (charge: PayChanguChargeResult) => {
    void loadReceipt(charge.payment_id);
  };

  const handleDone = () => {
    setReceipt(null);
    setBillDetail(null);
    setSelectedBillId(null);
    if (selectedPatient) selectPatient(selectedPatient);
  };

  const isPaid = billDetail?.payment_status?.toLowerCase() === "paid";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Finance
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Collect payment and print receipts
        </p>
      </section>

      {pageError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold">
          {pageError}
        </div>
      )}

      {/* Patient Search */}
      <section className="bg-card rounded-lg border p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search patient by name or hospital number..."
            aria-label="Search patient for payment"
            className="w-full px-4 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={patientQuery}
            onChange={(e) => searchPatients(e.target.value)}
          />
          {patientResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-border rounded-lg bg-card shadow-lg max-h-48 overflow-y-auto">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center justify-between border-b border-border last:border-b-0"
                >
                  <span className="font-semibold">{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.hospital_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {!selectedPatient && (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold">Search for a patient</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Find a patient to view their bill and collect payment
          </p>
        </div>
      )}

      {selectedPatient && !receipt && (
        <>
          <section className="bg-card rounded-lg border p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {selectedPatient.hospital_number}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setBills([]);
                setBillDetail(null);
                setReceipt(null);
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider"
            >
              Clear
            </button>
          </section>

          {billDetail ? (
            <>
              <BillPreview bill={billDetail} loading={billLoading} />
              <PaymentForm
                token={token}
                billId={billDetail.id}
                billNumber={billDetail.bill_number}
                balance={billDetail.balance}
                disabled={isPaid}
                onPaymentRecorded={handlePaymentRecorded}
                onPayChanguInitiated={handlePayChanguInitiated}
                onPayChanguCompleted={handlePayChanguCompleted}
              />
            </>
          ) : (
            <BillPicker
              bills={bills}
              selectedId={selectedBillId}
              loading={billsLoading}
              onSelect={(id) => void selectBill(id)}
            />
          )}
        </>
      )}

      {(receiptLoading || receipt) && selectedPatient && (
        <section>
          {receiptLoading ? (
            <div className="bg-card rounded-lg border p-6">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : receipt ? (
            <Receipt receipt={receipt} highlightPaymentId={highlightPaymentId} onDone={handleDone} />
          ) : null}
        </section>
      )}
    </div>
  );
}
