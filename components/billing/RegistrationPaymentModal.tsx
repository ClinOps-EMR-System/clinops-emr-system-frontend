"use client";

import { useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import Modal from "../ui/Modal";
import { Button } from "../ui/button";
import { Loader2 } from "lucide-react";

interface RegistrationPaymentModalProps {
  billId: number;
  billNumber: string;
  amountDue: number;
  onPaid: () => void;
  onClose?: () => void;
}

const PAYMENT_METHODS = ["Cash", "Card", "Mobile Money"] as const;

export default function RegistrationPaymentModal({
  billId,
  billNumber,
  amountDue,
  onPaid,
  onClose,
}: RegistrationPaymentModalProps) {
  const { token } = useAuth();
  const [amount, setAmount] = useState(amountDue.toString());
  const [method, setMethod] = useState<string>("Cash");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.post(
        `/bills/${billId}/payments`,
        {
          amount_paid: parsedAmount,
          payment_method: method,
          payment_reference: reference || null,
        },
        token
      );
      onPaid();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose ?? onPaid}
      title="Collect Registration Fee"
      subtitle={`Bill ${billNumber}`}
      size="md"
      footer={
        <>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={handlePay}
            disabled={loading}
            className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
              </span>
            ) : (
              "Confirm Payment"
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="field-payment-amount" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Amount (MK)
          </label>
          <input
            id="field-payment-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Payment Method
          </label>
          <div className="flex gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg border transition-colors ${
                  method === m
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="field-payment-reference" className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
            Reference (optional)
          </label>
          <input
            id="field-payment-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transaction ID, receipt number..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </Modal>
  );
}
