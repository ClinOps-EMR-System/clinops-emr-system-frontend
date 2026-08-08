"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { useRealtime } from "@/store/RealtimeContext";
import { api } from "@/lib/api";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import {
  Pill, Clock, CheckCircle, AlertTriangle, Package, ArrowRight, TrendingDown,
} from "lucide-react";

interface PharmacyWorklistItem {
  prescription_id: number;
  patient: { id: number; hospital_number: string; full_name: string };
  encounter_id: number;
  drug_name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity_dispensed: number | null;
  status: string;
  prescribed_by: string | null;
  prescribed_at: string;
}

interface StockAlert {
  low_stock: Array<{ id: number; name: string; current_stock: number; reorder_level: number }>;
  expiring_soon: Array<{
    id: number; batch_number: string; expiry_date: string; quantity_remaining: number; drug?: { name: string };
  }>;
}

type TabKey = "pending" | "verified";

const tabs: { key: TabKey; label: string; apiStatus: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Pending Review", apiStatus: "Pending", icon: <Clock className="h-4 w-4" /> },
  { key: "verified", label: "Verified — Ready to Dispense", apiStatus: "Verified", icon: <CheckCircle className="h-4 w-4" /> },
];

export default function PharmacyOverviewPage() {
  const { token } = useAuth();
  const { subscribe } = useRealtime();
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [items, setItems] = useState<PharmacyWorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<StockAlert | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const lowStockCount = alerts?.low_stock?.length ?? 0;
  const expiringCount = alerts?.expiring_soon?.length ?? 0;

  async function fetchWorklist(silent = false) {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const currentTab = tabs.find((t) => t.key === activeTab)!;
      const res = await api.get(`/worklist/pharmacy?status=${encodeURIComponent(currentTab.apiStatus)}`, token);
      const data = res?.data?.data ?? res?.data ?? [];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pharmacy worklist");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAlerts() {
    try {
      const res = await api.get("/stock/alerts", token);
      if (res?.data) setAlerts(res.data);
    } catch { /* stock alerts endpoint may not exist */ }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) {
      fetchWorklist();
      fetchAlerts();
    }
  }, [token, activeTab]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!token) return;
    const off = subscribe("clinops_pharmacy_queue", () => {
      void fetchWorklist(true);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token, activeTab]);

  // ── Verify prescription ──
  const handleVerify = async (prescriptionId: number) => {
    setSubmitting(true);
    try {
      await api.post(`/prescriptions/${prescriptionId}/verify`, {}, token);
      fetchWorklist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to verify prescription");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Dispense prescription ──
  const handleDispense = async (prescriptionId: number) => {
    setSubmitting(true);
    try {
      await api.post(`/prescriptions/${prescriptionId}/dispense`, { quantity_dispensed: 1 }, token);
      fetchWorklist();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to dispense prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Pharmacy</span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Pharmacy Worklist</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-amber-600">
              {loading ? <Skeleton className="h-8 w-16" /> : items.length}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : items.length}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all hover:shadow-sm", lowStockCount > 0 && "ring-1 ring-amber-500/20")}>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Low Stock</CardTitle>
            <TrendingDown className={cn("h-4 w-4", lowStockCount > 0 ? "text-amber-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", lowStockCount > 0 ? "text-amber-600" : "text-foreground")}>
              {lowStockCount}
            </div>
          </CardContent>
        </Card>

        <Card className={cn("transition-all hover:shadow-sm", expiringCount > 0 && "ring-1 ring-red-500/20")}>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expiring Soon</CardTitle>
            <AlertTriangle className={cn("h-4 w-4", expiringCount > 0 ? "text-red-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", expiringCount > 0 ? "text-red-600" : "text-foreground")}>
              {expiringCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <Button variant="outline"><Link href="/pharmacy/stock"><Package className="h-4 w-4 mr-2 inline" />Receive Stock</Link></Button>
        <Button variant="outline"><Link href="/pharmacy/inventory"><Pill className="h-4 w-4 mr-2 inline" />Drug Catalog</Link></Button>
        <Button variant="outline"><Link href="/pharmacy/alerts"><AlertTriangle className="h-4 w-4 mr-2 inline" />View Alerts</Link></Button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-white rounded border border-[#becab7]/50 p-1" role="tablist" aria-label="Pharmacy pipeline">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded transition-all min-h-[44px] ${
              activeTab === tab.key ? "bg-clinical-primary text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Worklist Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {activeTab === "pending" ? "Pending Review" : "Verified — Ready to Dispense"}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-sm text-red-600">{error}</div>
          ) : items.length === 0 ? (
            <EmptyState title={activeTab === "pending" ? "No pending prescriptions" : "No verified prescriptions"} description={activeTab === "pending" ? "All prescriptions have been reviewed" : "Verify pending prescriptions first"} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Drug</TableHead>
                  <TableHead>Dosage / Route / Freq</TableHead>
                  <TableHead>Prescribed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((rx) => (
                  <TableRow key={rx.prescription_id}>
                    <TableCell className="font-medium">
                      <div className="text-sm font-semibold text-gray-900">{rx.patient?.full_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{rx.patient?.hospital_number}</div>
                    </TableCell>
                    <TableCell className="text-sm font-semibold">{rx.drug_name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {rx.dosage} / {rx.route} / {rx.frequency}
                      {rx.duration && <span className="text-xs text-gray-400 ml-1">({rx.duration})</span>}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{rx.prescribed_by || "—"}</TableCell>
                    <TableCell>
                      <StatusBadge label={rx.status} variant={rx.status === "Pending" ? "warning" : "info"} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {activeTab === "pending" && (
                          <button
                            onClick={() => handleVerify(rx.prescription_id)}
                            disabled={submitting}
                            className="text-xs font-bold text-purple-600 hover:text-purple-800 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            Verify
                          </button>
                        )}
                        {activeTab === "verified" && (
                          <button
                            onClick={() => handleDispense(rx.prescription_id)}
                            disabled={submitting}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wider cursor-pointer disabled:opacity-50"
                          >
                            Dispense
                          </button>
                        )}
                        <Link href={`/patients/${rx.patient?.id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                          Profile
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
                      <StatusBadge label={drug.current_stock === 0 ? "Out of Stock" : "Low Stock"} variant={drug.current_stock === 0 ? "error" : "warning"} pulse={drug.current_stock === 0} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {lowStockCount > 5 && (
              <div className="px-6 py-3 border-t">
                <Link href="/pharmacy/alerts" className="text-sm font-medium text-primary hover:underline inline-flex items-center gap-1">
                  View all {lowStockCount} low stock items <ArrowRight className="size-4" />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
