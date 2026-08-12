"use client";

import Link from "next/link";
import { useFetch } from "../../../../lib/useFetch";
import { SectionHeader } from "../../../../components/ui/PageLayout";
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
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "../../../../components/ui/EmptyState";
import { AlertTriangle, TrendingDown, Package, ArrowRight } from "lucide-react";

interface StockAlert {
  low_stock: Array<{
    id: number;
    name: string;
    generic_name: string | null;
    current_stock: number;
    reorder_level: number;
    formulation: string | null;
  }>;
  expiring_soon: Array<{
    id: number;
    batch_number: string;
    expiry_date: string;
    quantity_remaining: number;
    drug?: { id: number; name: string };
  }>;
}

function getDaysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function AlertsPage() {
  const { data: alerts, loading } = useFetch<StockAlert>("/stock/alerts", { interval: 30000 });

  const lowStock = alerts?.low_stock ?? [];
  const expiringSoon = alerts?.expiring_soon ?? [];

  const sortedExpiring = [...expiringSoon].sort(
    (a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  );

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Stock Alerts"
        description="Drugs requiring attention — low stock levels and items expiring soon"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className={cn("transition-all hover:shadow-sm", lowStock.length > 0 && "ring-1 ring-amber-500/20")}>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <TrendingDown className={cn("size-4", lowStock.length > 0 ? "text-amber-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", lowStock.length > 0 ? "text-amber-700" : "text-foreground")}>
              {loading ? <Skeleton className="h-8 w-16" /> : lowStock.length}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all hover:shadow-sm", expiringSoon.length > 0 && "ring-1 ring-red-500/20")}>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expiring Soon
            </CardTitle>
            <AlertTriangle className={cn("size-4", expiringSoon.length > 0 ? "text-red-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", expiringSoon.length > 0 ? "text-red-600" : "text-foreground")}>
              {loading ? <Skeleton className="h-8 w-16" /> : expiringSoon.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", lowStock.length > 0 ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/30")} />
            Low Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead className="hidden md:table-cell">Generic Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : lowStock.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<TrendingDown className="h-6 w-6 text-muted-foreground/40" />}
                title="No low stock alerts"
                description="All drugs are above their reorder levels"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead className="hidden md:table-cell">Generic Name</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((drug) => (
                  <TableRow key={drug.id}>
                    <TableCell className="font-medium">{drug.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {drug.generic_name || "—"}
                    </TableCell>
                    <TableCell>
                      <span className={cn("tabular-nums font-medium", drug.current_stock === 0 ? "text-red-600" : "text-amber-700")}>
                        {drug.current_stock}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{drug.reorder_level}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={drug.current_stock === 0 ? "Out of Stock" : "Low Stock"}
                        variant={drug.current_stock === 0 ? "error" : "warning"}
                        pulse={drug.current_stock === 0}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href="/pharmacy/stock">
                        <Button size="sm" variant="ghost">
                          Receive Stock
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expiring Soon Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className={cn("size-1.5 rounded-full", expiringSoon.length > 0 ? "bg-red-500 animate-pulse" : "bg-muted-foreground/30")} />
            Expiring Within 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Qty Remaining</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : expiringSoon.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Package className="h-6 w-6 text-muted-foreground/40" />}
                title="No expiring batches"
                description="No stock batches are expiring within 30 days"
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Qty Remaining</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpiring.map((batch) => {
                  const daysLeft = getDaysUntilExpiry(batch.expiry_date);
                  return (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.drug?.name ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{batch.batch_number}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(batch.expiry_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          label={`${daysLeft}d`}
                          variant={daysLeft <= 7 ? "error" : "warning"}
                          pulse={daysLeft <= 7}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums">{batch.quantity_remaining}</TableCell>
                      <TableCell>
                        <Link href="/pharmacy/stock">
                          <Button size="sm" variant="ghost">
                            Manage
                            <ArrowRight className="size-3.5" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
