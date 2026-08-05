"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePayChanguCharge } from "@/lib/hooks/usePayChanguCharge";
import type { PayChanguChargeResult } from "@/lib/services/admin";

export interface RecordedPayment {
  id?: number;
  payment_number?: string;
  amount: number;
  method: string;
}

interface PaymentFormProps {
  token: string | null;
  billId: number;
  billNumber: string;
  balance: number;
  disabled?: boolean;
  onPaymentRecorded: (payment: RecordedPayment) => void;
  onPayChanguInitiated: (charge: PayChanguChargeResult) => void;
  onPayChanguCompleted?: (charge: PayChanguChargeResult) => void;
  onPayChanguError?: (message: string) => void;
}

const DIRECT_METHODS: Array<[string, string]> = [
  ["Cash", "Cash"],
  ["Bank Transfer", "Bank Transfer"],
  ["Mobile Money", "Mobile Money"],
  ["Insurance", "Insurance"],
  ["Card", "Card"],
];

export function PaymentForm({
  token,
  billId,
  billNumber,
  balance,
  disabled = false,
  onPaymentRecorded,
  onPayChanguInitiated,
  onPayChanguCompleted,
  onPayChanguError,
}: PaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const paychangu = usePayChanguCharge({ token, onCompleted: onPayChanguCompleted ?? onPayChanguInitiated });
  const isPayChangu = method === "paychangu";

  useEffect(() => {
    if (isPayChangu) paychangu.ensureOperatorsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayChangu]);

  const submitDisabled =
    disabled ||
    processing ||
    paychangu.charge !== null ||
    !amount ||
    (isPayChangu &&
      (paychangu.operators.length === 0 ||
        paychangu.operatorsError !== null ||
        !paychangu.operatorRef ||
        !paychangu.mobile));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setFormError("You must be logged in to record a payment.");
      return;
    }
    setProcessing(true);
    setFormError(null);
    try {
      const parsedAmount = parseFloat(amount);
      if (isPayChangu) {
        const charge = await paychangu.initialize(billId, parsedAmount);
        onPayChanguInitiated(charge);
      } else {
        const res = await api.post(
          `/bills/${billId}/payments`,
          {
            amount_paid: parsedAmount,
            payment_method: method,
            payment_reference: reference || null,
          },
          token
        );
        const payment =
          (res as { data?: RecordedPayment }).data ?? ({} as RecordedPayment);
        onPaymentRecorded({
          id: payment.id,
          payment_number: payment.payment_number,
          amount: parsedAmount,
          method,
        });
      }
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      if (apiError.status === 422) {
        const first = apiError.errors ? Object.values(apiError.errors)[0]?.[0] : undefined;
        const msg = first || "Invalid payment details.";
        setFormError(msg);
        onPayChanguError?.(msg);
      } else if (apiError.status === 502) {
        const msg = isPayChangu ? "Unable to initialize payment with PayChangu." : "A gateway error occurred. Please try again.";
        setFormError(msg);
        onPayChanguError?.(msg);
      } else {
        const msg = apiError.message || "Failed to record payment.";
        setFormError(msg);
        onPayChanguError?.(msg);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Record Payment — {billNumber}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {disabled && (
            <p className="text-sm text-emerald-700 font-semibold">This bill is fully paid.</p>
          )}
          {(formError || paychangu.error) && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 font-semibold">
              {paychangu.error || formError}
            </p>
          )}
          {isPayChangu && paychangu.charge && (
            <p className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-sm text-sky-800 font-semibold">
              Payment initiated. Ask the patient to complete it on their phone (charge{" "}
              <span className="font-mono">{paychangu.charge.charge_id}</span>). Waiting for confirmation…
            </p>
          )}

          <div>
            <label htmlFor="payment-amount" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
              Amount (MK) *
            </label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              required
              aria-label="amount"
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="payment-method" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
              Payment Method *
            </label>
            <select
              id="payment-method"
              aria-label="method"
              className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setFormError(null);
                if (e.target.value !== "paychangu") paychangu.reset();
              }}
              disabled={disabled}
            >
              {DIRECT_METHODS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value="paychangu">Mobile Money (PayChangu)</option>
            </select>
          </div>

          {isPayChangu ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="pc-operator" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Operator *
                </label>
                <select
                  id="pc-operator"
                  aria-label="operator"
                  className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={paychangu.operatorRef}
                  onChange={(e) => paychangu.setOperatorRef(e.target.value)}
                >
                  <option value="">Select operator…</option>
                  {paychangu.operators.map((op) => (
                    <option key={op.id} value={op.ref_id}>{op.name}</option>
                  ))}
                </select>
                {paychangu.operatorsLoading && (
                  <p className="text-xs text-muted-foreground mt-1">Loading operators…</p>
                )}
                {paychangu.operatorsError && (
                  <p className="text-xs text-red-600 mt-1">{paychangu.operatorsError}</p>
                )}
              </div>
              <div>
                <label htmlFor="pc-mobile" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Mobile Number *
                </label>
                <input
                  id="pc-mobile"
                  type="tel"
                  aria-label="mobile"
                  placeholder="e.g. 990000000"
                  className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={paychangu.mobile}
                  onChange={(e) => paychangu.setMobile(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="payment-reference" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                Reference Number
              </label>
              <input
                id="payment-reference"
                type="text"
                aria-label="reference"
                className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Transaction/receipt reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={disabled}
              />
            </div>
          )}

          <Button type="submit" disabled={submitDisabled}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPayChangu ? "Request Payment" : "Record Payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
