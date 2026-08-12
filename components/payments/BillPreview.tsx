"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { BillDetail } from "@/types/payments";

interface BillPreviewProps {
  bill: BillDetail;
  loading: boolean;
}

export function BillPreview({ bill, loading }: BillPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bill {bill.bill_number}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">MK {Number(item.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-medium">MK {Number(item.total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="font-mono font-medium">MK {Number(bill.total_amount).toLocaleString()}</span>
              </div>
              {Number(bill.paid_amount) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="font-mono font-medium text-emerald-600">MK {Number(bill.paid_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between font-semibold border-t border-border pt-1.5">
                <span>Balance due</span>
                <span className={`font-mono ml-2 ${Number(bill.balance) === 0 ? "text-emerald-600" : "text-red-600"}`}>
                  MK {Number(bill.balance).toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
