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

export function BillPicker({ bills, selectedId, loading, onSelect }: BillPickerProps) {
  const sorted = [...bills].sort((a, b) => {
    const rank = (s: BillSummary) =>
      s.payment_status?.toLowerCase() === "paid" ? 1 : 0;
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
            {sorted.map((bill) => (
              <li key={bill.id} className="px-4 py-3 flex items-center justify-between gap-3">
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
                    bill.payment_status?.toLowerCase() === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                    bill.payment_status?.toLowerCase() === "partially_paid" && "bg-amber-50 text-amber-700 border border-amber-200",
                    bill.payment_status?.toLowerCase() === "unpaid" && "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    {bill.payment_status?.replace("_", " ")}
                  </span>
                  <Button
                    size="sm"
                    variant={selectedId === bill.id ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => onSelect(bill.id)}
                  >
                    {selectedId === bill.id ? "Selected" : "Collect"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
