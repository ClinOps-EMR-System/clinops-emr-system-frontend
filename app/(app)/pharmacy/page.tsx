"use client";

import Link from "next/link";
import { useFetch } from "../../../lib/useFetch";
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
import { cn } from "@/lib/utils";
import {
  Pill,
  Clock,
  CheckCircle,
  AlertTriangle,
  Package,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface Prescription {
  id: number;
  status: string;
  drug?: { name: string; is_controlled: boolean };
  patient?: { first_name: string; last_name: string; hospital_number: string };
  dispensed_at?: string;
  created_at: string;
}

interface StockAlert {
  low_stock: Array<{ id: number; name: string; current_stock: number; reorder_level: number }>;
  expiring_soon: Array<{
    id: number;
    batch_number: string;
    expiry_date: string;
    quantity_remaining: number;
    drug?: { name: string };
  }>;
}

export default function PharmacyOverviewPage() {
  usePageTitle("Pharmacy");
  const { data: prescriptionsRaw, loading: rxLoading } = useFetch<Prescription[]>("/prescriptions", { interval: 30000 });
  const { data: alerts, loading: alertsLoading } = useFetch<StockAlert>("/stock/alerts", { interval: 30000 });

  const prescriptions = Array.isArray(prescriptionsRaw) ? prescriptionsRaw : [];

  const pendingCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "prescribed").length;
  const verifiedCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "verified").length;
  const dispensedCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "dispensed").length;
  const lowStockCount = alerts?.low_stock?.length ?? 0;
  const expiringCount = alerts?.expiring_soon?.length ?? 0;

  const recentDispensed = prescriptions
    .filter((rx) => rx.status?.toLowerCase() === "dispensed" && rx.dispensed_at)
    .sort((a, b) => new Date(b.dispensed_at!).getTime() - new Date(a.dispensed_at!).getTime())
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Pharmacy
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pharmacy Overview
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Link href="/pharmacy/dispensing" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pending
              </CardTitle>
              <Clock className={cn("size-4", pendingCount > 0 ? "text-amber-500" : "text-muted-foreground/60")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", pendingCount > 0 ? "text-amber-600" : "text-foreground")}>
                {rxLoading ? <Skeleton className="h-8 w-16" /> : pendingCount}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pharmacy/dispensing" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Verified
              </CardTitle>
              <CheckCircle className="size-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {rxLoading ? <Skeleton className="h-8 w-16" /> : verifiedCount}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pharmacy/dispensing" className="block">
          <Card className="transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dispensed Today
              </CardTitle>
              <CheckCircle className="size-4 text-muted-foreground/60" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {rxLoading ? <Skeleton className="h-8 w-16" /> : dispensedCount}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pharmacy/alerts" className="block">
          <Card className={cn("transition-all hover:shadow-sm", lowStockCount > 0 && "ring-1 ring-amber-500/20")}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Low Stock
              </CardTitle>
              <TrendingDown className={cn("size-4", lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground/60")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", lowStockCount > 0 ? "text-amber-600" : "text-foreground")}>
                {alertsLoading ? <Skeleton className="h-8 w-16" /> : lowStockCount}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pharmacy/alerts" className="block">
          <Card className={cn("transition-all hover:shadow-sm", expiringCount > 0 && "ring-1 ring-red-500/20")}>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Expiring Soon
              </CardTitle>
              <AlertTriangle className={cn("size-4", expiringCount > 0 ? "text-red-500" : "text-muted-foreground/60")} />
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", expiringCount > 0 ? "text-red-600" : "text-foreground")}>
                {alertsLoading ? <Skeleton className="h-8 w-16" /> : expiringCount}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button nativeButton={false} render={<Link href="/pharmacy/dispensing" />}>
          <Pill className="size-4" data-icon="inline-start" />
          Dispensing
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/pharmacy/stock" />}>
          <Package className="size-4" data-icon="inline-start" />
          Receive Stock
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/pharmacy/inventory" />}>
          <Package className="size-4" data-icon="inline-start" />
          Drug Catalog
        </Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/pharmacy/alerts" />}>
          <AlertTriangle className="size-4" data-icon="inline-start" />
          View Alerts
        </Button>
      </div>

      {/* Low Stock Alerts */}
      {lowStockCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Drug</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(alerts?.low_stock ?? []).slice(0, 5).map((drug) => (
                  <TableRow key={drug.id}>
                    <TableCell className="font-medium">{drug.name}</TableCell>
                    <TableCell className="tabular-nums">{drug.current_stock}</TableCell>
                    <TableCell className="tabular-nums">{drug.reorder_level}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={drug.current_stock === 0 ? "Out of Stock" : "Low Stock"}
                        variant={drug.current_stock === 0 ? "error" : "warning"}
                        pulse={drug.current_stock === 0}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {lowStockCount > 5 && (
              <div className="px-6 py-3 border-t">
                <Link href="/pharmacy/alerts" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                  View all {lowStockCount} low stock items
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Dispensing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Dispensing
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {rxLoading ? (
            <div className="px-6 py-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : recentDispensed.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No prescriptions dispensed yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>Dispensed At</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDispensed.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell className="font-medium">
                      {rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}` : "—"}
                    </TableCell>
                    <TableCell>{rx.drug?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {rx.dispensed_at ? new Date(rx.dispensed_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href="/pharmacy/dispensing" className="text-sm font-medium text-primary hover:underline">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
