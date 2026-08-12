"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
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
import { Input } from "@/components/ui/input";
import SelectField from "../../../../components/ui/SelectField";
import EmptyState from "../../../../components/ui/EmptyState";
import Modal from "../../../../components/ui/Modal";
import { Plus, Package, AlertTriangle, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";
import { RoleGuard } from "@/components/auth/RoleGuard";

interface StockBatch {
  id: number;
  drug_id: number;
  batch_number: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  supplier_name: string | null;
  supplier_phone: string | null;
  received_at: string;
  is_expired: boolean;
  is_expiring_soon: boolean;
  drug?: { id: number; name: string };
  receivedBy?: { name: string };
}

interface Drug {
  id: number;
  name: string;
  current_stock: number;
}

type ExpiryFilter = "all" | "active" | "expiring_soon" | "expired";

const expiryOptions = [
  { value: "all", label: "All Batches" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

type ModalType = "receive" | "adjust" | "waste" | null;

export default function StockPage() {
  const { token } = useAuth();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilter>("all");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batches, setBatches] = useState<StockBatch[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [adjustBatches, setAdjustBatches] = useState<StockBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (expiryFilter === "expiring_soon") params.set("expiring_soon", "true");
    if (expiryFilter === "expired") params.set("expired", "true");
    if (expiryFilter === "active") params.set("has_stock", "true");
    return params.toString();
  }, [page, expiryFilter]);

  const fetchBatches = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/stock?${queryParams}`, token);
      setBatches(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch {
      setBatches([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [token, queryParams]);

  const fetchDrugs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/drugs?per_page=100", token);
      setDrugs(res.data ?? []);
    } catch {
      setDrugs([]);
    }
  }, [token]);

  const fetchAdjustBatches = useCallback(async (drugId: string) => {
    if (!token || !drugId) { setAdjustBatches([]); return; }
    try {
      const res = await api.get(`/stock/${drugId}/batches`, token);
      setAdjustBatches(Array.isArray(res) ? res : res.data ?? []);
    } catch {
      setAdjustBatches([]);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBatches();
  }, [fetchBatches]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDrugs();
  }, [fetchDrugs]);

  const [receiveForm, setReceiveForm] = useState({
    drug_id: "",
    batch_number: "",
    expiry_date: "",
    quantity: "",
    unit_cost: "",
    supplier_name: "",
    supplier_phone: "",
  });

  const [adjustForm, setAdjustForm] = useState({
    drug_id: "",
    stock_batch_id: "",
    quantity: "",
    reason: "",
  });

  const [wasteForm, setWasteForm] = useState({
    drug_id: "",
    stock_batch_id: "",
    quantity: "",
    reason: "",
  });

  const resetForms = () => {
    setReceiveForm({ drug_id: "", batch_number: "", expiry_date: "", quantity: "", unit_cost: "", supplier_name: "", supplier_phone: "" });
    setAdjustForm({ drug_id: "", stock_batch_id: "", quantity: "", reason: "" });
    setWasteForm({ drug_id: "", stock_batch_id: "", quantity: "", reason: "" });
    setSelectedBatch(null);
    setError(null);
  };

  const openReceive = () => { resetForms(); setModalType("receive"); };
  const openAdjust = (batch?: StockBatch) => {
    resetForms();
    if (batch) {
      setSelectedBatch(batch);
      setAdjustForm({ drug_id: String(batch.drug_id), stock_batch_id: String(batch.id), quantity: "", reason: "" });
      fetchAdjustBatches(String(batch.drug_id));
    }
    setModalType("adjust");
  };
  const openWaste = (batch: StockBatch) => {
    resetForms();
    setSelectedBatch(batch);
    setWasteForm({ drug_id: String(batch.drug_id), stock_batch_id: String(batch.id), quantity: "", reason: "" });
    setModalType("waste");
  };

  const handleReceive = async () => {
    if (!receiveForm.drug_id || !receiveForm.batch_number || !receiveForm.expiry_date || !receiveForm.quantity || !receiveForm.unit_cost) {
      setError("All required fields must be filled");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/stock/receive", {
        drug_id: Number(receiveForm.drug_id),
        batch_number: receiveForm.batch_number,
        expiry_date: receiveForm.expiry_date,
        quantity: Number(receiveForm.quantity),
        unit_cost: Number(receiveForm.unit_cost),
        supplier_name: receiveForm.supplier_name || null,
        supplier_phone: receiveForm.supplier_phone || null,
      }, token);
      setModalType(null);
      resetForms();
      fetchBatches();
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      setError(apiError.message || Object.values(apiError.errors ?? {})[0]?.[0] || "Failed to receive stock");
    } finally {
      setSaving(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustForm.drug_id || !adjustForm.quantity || !adjustForm.reason) {
      setError("All required fields must be filled");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/stock/adjust", {
        drug_id: Number(adjustForm.drug_id),
        stock_batch_id: adjustForm.stock_batch_id ? Number(adjustForm.stock_batch_id) : null,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason,
      }, token);
      setModalType(null);
      resetForms();
      fetchBatches();
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      setError(apiError.message || Object.values(apiError.errors ?? {})[0]?.[0] || "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  };

  const handleWaste = async () => {
    if (!wasteForm.drug_id || !wasteForm.stock_batch_id || !wasteForm.quantity || !wasteForm.reason) {
      setError("All required fields must be filled");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/stock/waste", {
        drug_id: Number(wasteForm.drug_id),
        stock_batch_id: Number(wasteForm.stock_batch_id),
        quantity: Number(wasteForm.quantity),
        reason: wasteForm.reason,
      }, token);
      setModalType(null);
      resetForms();
      fetchBatches();
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      setError(apiError.message || Object.values(apiError.errors ?? {})[0]?.[0] || "Failed to record waste");
    } finally {
      setSaving(false);
    }
  };

  const getBatchStatus = (batch: StockBatch): { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" } => {
    if (batch.is_expired) return { label: "Expired", variant: "error" };
    if (batch.is_expiring_soon) return { label: "Expiring Soon", variant: "warning" };
    if (batch.quantity_remaining === 0) return { label: "Depleted", variant: "neutral" };
    return { label: "Active", variant: "success" };
  };

  return (
    <RoleGuard allowedRoles={["pharmacist", "admin"]}>
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Stock Management"
        description="Manage drug stock batches, receive new stock, and record adjustments"
        action={
          can("pharmacy.stock.manage") ? (
            <Button onClick={openReceive}>
              <Plus className="size-4" data-icon="inline-start" />
              Receive Stock
            </Button>
          ) : undefined
        }
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Batches
            </CardTitle>
            <Package className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {loading ? <Skeleton className="h-8 w-16" /> : meta?.total ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expiring Soon
            </CardTitle>
            <AlertTriangle className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-amber-600">
              {loading ? <Skeleton className="h-8 w-16" /> : batches.filter((b) => b.is_expiring_soon).length}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expired
            </CardTitle>
            <AlertTriangle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-red-600">
              {loading ? <Skeleton className="h-8 w-16" /> : batches.filter((b) => b.is_expired).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      {can("pharmacy.stock.manage") && (
        <div className="flex gap-3">
          <Button onClick={openReceive}>
            <ArrowDownCircle className="size-4" data-icon="inline-start" />
            Receive Stock
          </Button>
          <Button variant="outline" onClick={() => openAdjust()}>
            <ArrowUpCircle className="size-4" data-icon="inline-start" />
            Adjust Stock
          </Button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <SelectField
                label="Status"
                options={expiryOptions}
                value={expiryFilter}
                onChange={(e) => { setExpiryFilter(e.target.value as ExpiryFilter); setPage(1); }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stock Batches
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
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead>Qty Remaining</TableHead>
                    <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Package className="h-6 w-6 text-muted-foreground/40" />}
                title="No stock batches"
                description="Receive stock to get started"
                action={
                  can("pharmacy.stock.manage") ? (
                    <Button onClick={openReceive}>
                      <Plus className="size-4" data-icon="inline-start" />
                      Receive Stock
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Drug</TableHead>
                    <TableHead>Batch #</TableHead>
                    <TableHead className="hidden md:table-cell">Expiry</TableHead>
                    <TableHead>Qty Remaining</TableHead>
                    <TableHead className="hidden lg:table-cell">Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => {
                    const status = getBatchStatus(batch);
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.drug?.name ?? "—"}</TableCell>
                        <TableCell className="font-mono text-sm">{batch.batch_number}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                          {new Date(batch.expiry_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={cn("tabular-nums font-medium", batch.quantity_remaining === 0 ? "text-muted-foreground" : "")}>
                            {batch.quantity_remaining}
                          </span>
                          <span className="text-muted-foreground text-xs"> / {batch.quantity_received}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                          {batch.supplier_name || "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge label={status.label} variant={status.variant} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {can("pharmacy.stock.manage") && (
                              <>
                                <Button size="sm" variant="ghost" onClick={() => openAdjust(batch)}>
                                  Adjust
                                </Button>
                                {batch.quantity_remaining > 0 && (
                                  <Button size="sm" variant="ghost" onClick={() => openWaste(batch)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {meta && meta.last_page > 1 && (
                <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono">
                    Showing {(meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={meta.current_page <= 1} onClick={() => setPage(meta.current_page - 1)}>
                      Previous
                    </Button>
                    <Button size="sm" variant="outline" disabled={meta.current_page >= meta.last_page} onClick={() => setPage(meta.current_page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Receive Stock Modal */}
      <Modal
        open={modalType === "receive"}
        onClose={() => { setModalType(null); resetForms(); }}
        title="Receive Stock"
        subtitle="Add new stock batch to inventory"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalType(null); resetForms(); }}>Cancel</Button>
            <Button onClick={handleReceive} disabled={saving}>{saving ? "Receiving..." : "Receive Stock"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Drug *</label>
            <SelectField
              label=""
              options={drugs.map((d) => ({ value: String(d.id), label: d.name }))}
              value={receiveForm.drug_id}
              onChange={(e) => setReceiveForm({ ...receiveForm, drug_id: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Batch Number *</label>
              <Input value={receiveForm.batch_number} onChange={(e) => setReceiveForm({ ...receiveForm, batch_number: e.target.value })} placeholder="e.g. BN-2026-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Expiry Date *</label>
              <Input type="date" value={receiveForm.expiry_date} onChange={(e) => setReceiveForm({ ...receiveForm, expiry_date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity *</label>
              <Input type="number" min={1} value={receiveForm.quantity} onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Cost *</label>
              <Input type="number" min={0} step={0.01} value={receiveForm.unit_cost} onChange={(e) => setReceiveForm({ ...receiveForm, unit_cost: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier Name</label>
              <Input value={receiveForm.supplier_name} onChange={(e) => setReceiveForm({ ...receiveForm, supplier_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplier Phone</label>
              <Input value={receiveForm.supplier_phone} onChange={(e) => setReceiveForm({ ...receiveForm, supplier_phone: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={modalType === "adjust"}
        onClose={() => { setModalType(null); resetForms(); }}
        title="Adjust Stock"
        subtitle="Increase or decrease stock quantity"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalType(null); resetForms(); }}>Cancel</Button>
            <Button onClick={handleAdjust} disabled={saving}>{saving ? "Adjusting..." : "Confirm Adjustment"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Drug *</label>
            <SelectField
              label=""
              options={drugs.map((d) => ({ value: String(d.id), label: d.name }))}
              value={adjustForm.drug_id}
              onChange={(e) => {
                setAdjustForm({ ...adjustForm, drug_id: e.target.value, stock_batch_id: "" });
                fetchAdjustBatches(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Batch (optional)</label>
            <SelectField
              label=""
              options={adjustBatches.map((b) => ({
                value: String(b.id),
                label: `${b.batch_number} — ${b.quantity_remaining} units (exp: ${new Date(b.expiry_date).toLocaleDateString()})`,
              }))}
              value={adjustForm.stock_batch_id}
              onChange={(e) => setAdjustForm({ ...adjustForm, stock_batch_id: e.target.value })}
              placeholder="Leave empty for general adjustment"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity * (positive to add, negative to subtract)</label>
            <Input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })} placeholder="e.g. 50 or -10" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason *</label>
            <Input value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} placeholder="e.g. Stock count correction" />
          </div>
        </div>
      </Modal>

      {/* Waste Stock Modal */}
      <Modal
        open={modalType === "waste"}
        onClose={() => { setModalType(null); resetForms(); }}
        title="Record Waste"
        subtitle="Record waste for expired or damaged stock"
        footer={
          <>
            <Button variant="outline" onClick={() => { setModalType(null); resetForms(); }}>Cancel</Button>
            <Button onClick={handleWaste} disabled={saving}>{saving ? "Recording..." : "Confirm Waste"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedBatch && (
            <div className="rounded border p-3 text-sm">
              <span className="text-muted-foreground">Batch:</span>{" "}
              <span className="font-medium">{selectedBatch.batch_number}</span>
              <span className="text-muted-foreground ml-2">Remaining:</span>{" "}
              <span className="font-medium">{selectedBatch.quantity_remaining}</span>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Quantity *</label>
            <Input type="number" min={1} max={selectedBatch?.quantity_remaining} value={wasteForm.quantity} onChange={(e) => setWasteForm({ ...wasteForm, quantity: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason *</label>
            <Input value={wasteForm.reason} onChange={(e) => setWasteForm({ ...wasteForm, reason: e.target.value })} placeholder="e.g. Expired, damaged in transit" />
          </div>
        </div>
      </Modal>
    </div>
    </RoleGuard>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
