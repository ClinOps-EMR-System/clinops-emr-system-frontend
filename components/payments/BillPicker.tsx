"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillSummary } from "@/types/payments";

interface BillPickerProps {
  bills: BillSummary[];
  selectedId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
}

const normalizeStatus = (status?: string) =>
  (status ?? "").toLowerCase().replace("_", " ");

export function BillPicker({ bills, selectedId, loading, onSelect }: BillPickerProps) {
  const sorted = [...bills].sort((a, b) => {
    const rank = (s: BillSummary) => (normalizeStatus(s.payment_status) === "paid" ? 1 : 0);
    return rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Bill
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
            title="No bills found"
            description="This patient has no bills."
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {sorted.map((bill) => {
              const isPaid = normalizeStatus(bill.payment_status) === "paid" || normalizeStatus(bill.payment_status) === "waived";
              return (
                <li key={bill.id} className={cn("px-4 py-3 flex items-center justify-between gap-3", isPaid && "opacity-60")}>
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold">{bill.bill_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : "—"}
                      {" · "}
                      <span className="font-mono">
                        MK {Number(bill.balance).toLocaleString()} balance
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      normalizeStatus(bill.payment_status) === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                      normalizeStatus(bill.payment_status) === "partially paid" && "bg-amber-50 text-amber-700 border border-amber-200",
                      normalizeStatus(bill.payment_status) === "unpaid" && "bg-red-50 text-red-700 border border-red-200"
                    )}>
                      {bill.payment_status?.replace("_", " ")}
                    </span>
                    <Button
                      size="sm"
                      variant={selectedId === bill.id ? "default" : "outline"}
                      className="h-7 text-xs"
                      onClick={() => !isPaid && onSelect(bill.id)}
                      disabled={isPaid}
                      title={isPaid ? "This bill has already been paid" : undefined}
                    >
                      {isPaid ? "Paid ✓" : selectedId === bill.id ? "Selected" : "Collect"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
