"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReceiptData } from "@/types/payments";

interface ReceiptProps {
  receipt: ReceiptData;
  highlightPaymentId?: number;
  onDone: () => void;
}

export function Receipt({ receipt, highlightPaymentId, onDone }: ReceiptProps) {
  const fmt = (n: number) => `MK ${Number(n).toLocaleString()}`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold">Receipt</h3>
              <p className="font-mono text-sm text-muted-foreground">{receipt.bill_number}</p>
            </div>
            {receipt.patient && (
              <div className="text-right text-sm">
                <p className="font-semibold">
                  {receipt.patient.first_name} {receipt.patient.last_name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {receipt.patient.hospital_number}
                </p>
              </div>
            )}
          </div>

          <div className="my-4">
            {receipt.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {receipt.items.map((item) => (
                  <li key={item.id} className="py-2 flex items-center justify-between text-sm">
                    <span>
                      {item.item_name}{" "}
                      <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                    </span>
                    <span className="font-mono">{fmt(item.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono">{fmt(receipt.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-mono text-emerald-600">{fmt(receipt.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance Due</span>
              <span className="font-mono text-red-600">{fmt(receipt.balance)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t pt-3">
            {receipt.payments.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1 text-sm",
                  highlightPaymentId === p.id && "bg-emerald-50 border border-emerald-200"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {highlightPaymentId === p.id && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  <span className="font-mono">{p.payment_number || `#${p.id}`}</span>
                  <span className="text-xs text-muted-foreground">{p.payment_method}</span>
                </span>
                <span className="font-mono">{fmt(p.amount_paid)}</span>
              </div>
            ))}
            {receipt.issued_by && (
              <p className="pt-2 text-xs text-muted-foreground">
                Collected by {receipt.issued_by.name} ·{" "}
                {receipt.payments[0]?.created_at
                  ? new Date(receipt.payments[0].created_at).toLocaleString()
                  : new Date(receipt.created_at ?? new Date()).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={onDone}>Done</Button>
        </div>
      </CardContent>
    </Card>
  );
}
