"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/RoleContext";
import { BillPreviewSkeleton } from "@/components/payments/BillPreviewSkeleton";
import { PaymentFormSkeleton } from "@/components/payments/PaymentFormSkeleton";
import { ReceiptPreviewSkeleton } from "@/components/payments/ReceiptPreviewSkeleton";
import { Banknote } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  hospital_number: string;
}

export default function PaymentsPage() {
  usePageTitle("Payments");
  const { token } = useAuth();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Finance</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Payments</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Collect payment and print receipts</p>
      </section>

      {/* Patient Search */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search patient by name or hospital number..."
            aria-label="Search patient for payment"
            className="w-full px-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
            value={patientQuery}
            onChange={(e) => searchPatients(e.target.value)}
          />
          {patientResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-gray-200 rounded bg-white shadow-lg max-h-48 overflow-y-auto">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPatient(p);
                    setPatientResults([]);
                    setPatientQuery("");
                  }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-[#fcf9f8] flex items-center justify-between border-b border-gray-50 last:border-b-0"
                >
                  <span className="font-semibold text-gray-900">{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-gray-500 font-mono">{p.hospital_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedPatient && (
        <>
          {/* Patient Info */}
          <section className="bg-white rounded border border-[#becab7]/50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedPatient.first_name} {selectedPatient.last_name}
                </h3>
                <p className="text-sm text-gray-500 font-mono">{selectedPatient.hospital_number}</p>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider"
              >
                Clear
              </button>
            </div>
          </section>

          {/* Bill Preview (Skeleton) */}
          <BillPreviewSkeleton />

          {/* Payment Form (Skeleton) */}
          <PaymentFormSkeleton />

          {/* Receipt Preview (Skeleton) */}
          <ReceiptPreviewSkeleton />
        </>
      )}

      {!selectedPatient && (
        <div className="bg-white rounded border border-[#becab7]/50 p-12 text-center">
          <Banknote className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-700">Search for a patient</h3>
          <p className="text-sm text-gray-500 mt-2">Find a patient to view their bill and collect payment</p>
        </div>
      )}
    </div>
  );
}
