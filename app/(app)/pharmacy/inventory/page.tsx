"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useFetch } from "../../../../lib/useFetch";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../store/RoleContext";
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
import { Search, X, Plus, Package, AlertTriangle, Pill } from "lucide-react";

interface Drug {
  id: number;
  name: string;
  generic_name: string | null;
  atc_code: string | null;
  formulation: string | null;
  strength: string | null;
  unit: string | null;
  route: string | null;
  is_controlled: boolean;
  current_stock: number;
  reorder_level: number;
}

interface StockAlert {
  low_stock: Array<{ id: number }>;
  expiring_soon: Array<{ id: number }>;
}

type ControlledFilter = "all" | "true" | "false";

const controlledOptions = [
  { value: "all", label: "All Drugs" },
  { value: "true", label: "Controlled Only" },
  { value: "false", label: "Non-Controlled" },
];

export default function InventoryPage() {
  const { token } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [controlledFilter, setControlledFilter] = useState<ControlledFilter>("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [meta, setMeta] = useState<{ current_page: number; last_page: number; per_page: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), per_page: "20" });
    if (search) params.set("search", search);
    if (controlledFilter !== "all") params.set("is_controlled", controlledFilter);
    return params.toString();
  }, [page, search, controlledFilter]);

  const fetchDrugs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await api.get(`/drugs?${queryParams}`, token);
      setDrugs(res.data ?? []);
      setMeta(res.meta ?? null);
    } catch {
      setDrugs([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [token, queryParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDrugs();
  }, [fetchDrugs]);
  const { data: alerts } = useFetch<StockAlert>("/stock/alerts", { interval: 30000 });

  const [form, setForm] = useState({
    name: "",
    generic_name: "",
    atc_code: "",
    formulation: "",
    strength: "",
    unit: "",
    route: "",
    is_controlled: false,
    reorder_level: 10,
  });

  const resetForm = () => {
    setForm({ name: "", generic_name: "", atc_code: "", formulation: "", strength: "", unit: "", route: "", is_controlled: false, reorder_level: 10 });
    setEditingDrug(null);
    setError(null);
  };

  const openAddModal = () => {
    resetForm();
    setAddModalOpen(true);
  };

  const openEditModal = (drug: Drug) => {
    setForm({
      name: drug.name,
      generic_name: drug.generic_name ?? "",
      atc_code: drug.atc_code ?? "",
      formulation: drug.formulation ?? "",
      strength: drug.strength ?? "",
      unit: drug.unit ?? "",
      route: drug.route ?? "",
      is_controlled: drug.is_controlled,
      reorder_level: drug.reorder_level,
    });
    setEditingDrug(drug);
    setAddModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Drug name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        generic_name: form.generic_name || null,
        atc_code: form.atc_code || null,
        formulation: form.formulation || null,
        strength: form.strength || null,
        unit: form.unit || null,
        route: form.route || null,
      };
      if (editingDrug) {
        await api.put(`/drugs/${editingDrug.id}`, payload, token);
      } else {
        await api.post("/drugs", payload, token);
      }
      setAddModalOpen(false);
      resetForm();
      fetchDrugs();
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      setError(apiError.message || Object.values(apiError.errors ?? {})[0]?.[0] || "Failed to save drug");
    } finally {
      setSaving(false);
    }
  };

  const hasFilters = search !== "" || controlledFilter !== "all";

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Drug Catalog"
        description="Manage your pharmacy drug inventory"
        action={
          <Button onClick={openAddModal}>
            <Plus className="size-4" data-icon="inline-start" />
            Add Drug
          </Button>
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
              Total Drugs
            </CardTitle>
            <Pill className="size-4 text-muted-foreground/60" />
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
              Low Stock
            </CardTitle>
            <AlertTriangle className={cn("size-4", (alerts?.low_stock?.length ?? 0) > 0 ? "text-amber-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", (alerts?.low_stock?.length ?? 0) > 0 ? "text-amber-700" : "text-foreground")}>
              {loading ? <Skeleton className="h-8 w-16" /> : alerts?.low_stock?.length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Expiring Soon
            </CardTitle>
            <AlertTriangle className={cn("size-4", (alerts?.expiring_soon?.length ?? 0) > 0 ? "text-red-500" : "text-muted-foreground/60")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-semibold tabular-nums tracking-tight", (alerts?.expiring_soon?.length ?? 0) > 0 ? "text-red-600" : "text-foreground")}>
              {loading ? <Skeleton className="h-8 w-16" /> : alerts?.expiring_soon?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Toolbar */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name, generic name, or ATC code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <SelectField
                label="Category"
                options={controlledOptions}
                value={controlledFilter}
                onChange={(e) => { setControlledFilter(e.target.value as ControlledFilter); setPage(1); }}
              />
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => { setSearch(""); setControlledFilter("all"); setPage(1); }}
                className="text-destructive hover:text-destructive/80 h-9 mt-5"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Drugs
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="px-6 py-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Generic Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Formulation</TableHead>
                    <TableHead className="hidden lg:table-cell">Strength</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Controlled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }, (_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-16 rounded-md" /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : drugs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Package className="h-6 w-6 text-muted-foreground/40" />}
                title="No drugs found"
                description={hasFilters ? "Try adjusting your filters" : "Add your first drug to get started"}
                action={
                  !hasFilters ? (
                    <Button onClick={openAddModal}>
                      <Plus className="size-4" data-icon="inline-start" />
                      Add Drug
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
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Generic Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Formulation</TableHead>
                    <TableHead className="hidden lg:table-cell">Strength</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Controlled</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drugs.map((drug) => (
                    <TableRow key={drug.id}>
                      <TableCell className="font-medium">{drug.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {drug.generic_name || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {drug.formulation || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground font-mono text-sm">
                        {drug.strength || "—"}
                      </TableCell>
                      <TableCell>
                        <span className={cn("tabular-nums font-medium", drug.current_stock <= drug.reorder_level && drug.reorder_level > 0 ? "text-amber-700" : "")}>
                          {drug.current_stock}
                        </span>
                      </TableCell>
                      <TableCell>
                        {drug.is_controlled ? (
                          <StatusBadge label="Controlled" variant="error" />
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(drug)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {meta && meta.last_page > 1 && (
                <div className="px-6 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-mono">
                    Showing {(meta.current_page - 1) * meta.per_page + 1}–{Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.current_page <= 1}
                      onClick={() => setPage(meta.current_page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={meta.current_page >= meta.last_page}
                      onClick={() => setPage(meta.current_page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Drug Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => { setAddModalOpen(false); resetForm(); }}
        title={editingDrug ? "Edit Drug" : "Add New Drug"}
        subtitle={editingDrug ? "Update drug details" : "Add a new drug to the catalog"}
        footer={
          <>
            <Button variant="outline" onClick={() => { setAddModalOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingDrug ? "Update Drug" : "Add Drug"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amoxicillin" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Generic Name</label>
              <Input value={form.generic_name} onChange={(e) => setForm({ ...form, generic_name: e.target.value })} placeholder="e.g. amoxicillin" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">ATC Code</label>
              <Input value={form.atc_code} onChange={(e) => setForm({ ...form, atc_code: e.target.value })} placeholder="e.g. J01CA04" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Formulation</label>
              <Input value={form.formulation} onChange={(e) => setForm({ ...form, formulation: e.target.value })} placeholder="e.g. Tablet" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Strength</label>
              <Input value={form.strength} onChange={(e) => setForm({ ...form, strength: e.target.value })} placeholder="e.g. 500mg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. tablets" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Route</label>
              <Input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="e.g. Oral" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Reorder Level</label>
              <Input type="number" min={0} value={form.reorder_level} onChange={(e) => setForm({ ...form, reorder_level: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="is_controlled"
                checked={form.is_controlled}
                onChange={(e) => setForm({ ...form, is_controlled: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_controlled" className="text-sm font-medium">Controlled Substance</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
