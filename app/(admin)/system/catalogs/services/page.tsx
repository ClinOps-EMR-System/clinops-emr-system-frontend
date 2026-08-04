"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { adminApi } from "@/lib/services/admin";
import type { BillableService, LoincCode } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { loincToServiceFields, resolveAutoBilled, formatBillingUnit } from "@/lib/billing/catalog";
import type { AutoBilledRow } from "@/lib/billing/catalog";

const BILLING_UNITS = [
  "per_registration",
  "per_visit",
  "per_admission",
  "per_discharge",
  "per_day",
  "per_procedure",
  "per_surgery",
  "per_session",
  "per_test",
  "per_exam",
  "per_item",
  "per_unit",
  "per_dose",
  "per_document",
  "per_report",
  "per_trip",
  "per_hour",
];

export default function ServicesCatalogPage() {
  const { token } = useAuth();
  const { can } = usePermissions();
  const canManage = can("catalog.manage");
  const [items, setItems] = useState<BillableService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillableService | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    billing_unit: "",
    unit_price: "",
  });

  const [autoItems, setAutoItems] = useState<BillableService[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const autoRows = resolveAutoBilled(autoItems);
  const [loincQuery, setLoincQuery] = useState("");
  const [loincResults, setLoincResults] = useState<LoincCode[]>([]);
  const [loincLoading, setLoincLoading] = useState(false);
  const [loincSearched, setLoincSearched] = useState(false);
  const loincRequestId = useRef(0);

  const load = useCallback(
    async (opts?: { search?: string; category?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const qSearch = opts?.search ?? search;
        const qCategory = opts?.category ?? category;
        const res = await adminApi.listServices(token, {
          search: qSearch || undefined,
          category: qCategory === "all" ? undefined : qCategory,
        });
        setItems(res.data);
        setAllCategories((prev) => {
          const merged = new Set(prev);
          for (const s of res.data) {
            if (s.category) merged.add(s.category);
          }
          return Array.from(merged).sort();
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load services");
      } finally {
        setLoading(false);
      }
    },
    [token, search, category],
  );

  const loadAuto = useCallback(async () => {
    try {
      const res = await adminApi.listServices(token);
      setAutoItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auto-billed services");
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      const t = setTimeout(() => {
        void load();
        void loadAuto();
      }, 0);
      return () => clearTimeout(t);
    }
    // Depends on `token` only: the initial load must wait for AuthProvider to
    // hydrate the token from localStorage after mount, then run once. Later
    // search/category changes reload via the explicit controls (Enter, Load
    // button, category select), not via this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openCreate = () => {
    setEditing(null);
    setForm({ code: "", name: "", category: "", billing_unit: "", unit_price: "" });
    setOpen(true);
    setLoincQuery("");
    setLoincResults([]);
    setLoincSearched(false);
    setLoincLoading(false);
  };

  const openEdit = (s: BillableService) => {
    setEditing(s);
    setForm({
      code: s.code,
      name: s.name,
      category: s.category || "",
      billing_unit: s.billing_unit || "",
      unit_price: String(s.unit_price),
    });
    setOpen(true);
    setLoincQuery("");
    setLoincResults([]);
    setLoincSearched(false);
    setLoincLoading(false);
  };

  const save = async () => {
    const body = {
      code: form.code,
      name: form.name,
      category: form.category || null,
      billing_unit: form.billing_unit || null,
      unit_price: Number(form.unit_price) || 0,
    };
    try {
      if (editing) await adminApi.updateService(token, editing.id, body);
      else await adminApi.createService(token, body);
      setOpen(false);
      await Promise.all([load(), loadAuto()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (s: BillableService) => {
    if (!confirm(`Delete service ${s.name}?`)) return;
    try {
      await adminApi.deleteService(token, s.id);
      await Promise.all([load(), loadAuto()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const saveAutoPrice = async (row: AutoBilledRow) => {
    const price = Number(priceDrafts[row.seed.code] ?? row.service?.unit_price ?? 0) || 0;
    setSavingCode(row.seed.code);
    try {
      if (row.service) {
        await adminApi.updateService(token, row.service.id, {
          code: row.service.code,
          name: row.service.name,
          category: row.service.category || null,
          billing_unit: row.service.billing_unit || row.seed.billing_unit || null,
          unit_price: price,
        });
      } else {
        await adminApi.createService(token, {
          code: row.seed.code,
          name: row.seed.name,
          category: row.seed.category,
          billing_unit: row.seed.billing_unit || null,
          unit_price: price,
        });
      }
      setPriceDrafts((d) => ({ ...d, [row.seed.code]: String(price) }));
      await Promise.all([loadAuto(), load()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingCode(null);
    }
  };

  useEffect(() => {
    if (form.category?.toLowerCase() !== "lab" || loincQuery.trim().length < 2) {
      loincRequestId.current++;
      setLoincResults([]); // eslint-disable-line react-hooks/set-state-in-effect
      setLoincSearched(false);
      setLoincLoading(false);
      return;
    }
    const t = setTimeout(async () => {
      const requestId = ++loincRequestId.current;
      setLoincLoading(true);
      try {
        const results = await adminApi.searchLoinc(token, loincQuery.trim());
        if (requestId !== loincRequestId.current) return;
        setLoincResults(results);
        setLoincSearched(true);
      } catch (e) {
        if (requestId !== loincRequestId.current) return;
        setError(e instanceof Error ? e.message : "LOINC search failed");
        setLoincResults([]);
        setLoincSearched(true);
      } finally {
        if (requestId === loincRequestId.current) setLoincLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, loincQuery, token]);

  const applyLoinc = (loinc: LoincCode) => {
    const fields = loincToServiceFields(loinc);
    setForm((f) => ({ ...f, ...fields }));
    setLoincQuery("");
    setLoincResults([]);
    setLoincSearched(false);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Billable services
          </h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Catalog of services used when creating bills.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name or code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load({ search });
              }}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-white px-3 text-sm"
            value={category}
            onChange={(e) => {
              const value = e.target.value;
              setCategory(value);
              void load({ category: value });
            }}
          >
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => void load({ search })}
          >
            <Search className="h-4 w-4" />
            Load
          </Button>
          {canManage && (
            <Button size="sm" className="gap-1.5" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New service
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}

      <div className="rounded-lg border border-[var(--outline)] bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold">Auto-billed services</h2>
          <p className="mt-0.5 text-xs text-[var(--clinical-muted)]">
            Prices applied automatically at consultation, admission and discharge.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Billing unit</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {autoRows.map((row) => {
              const draft =
                priceDrafts[row.seed.code] ??
                (row.service ? String(row.service.unit_price) : "0");
              return (
                <TableRow key={row.seed.code}>
                  <TableCell className="font-mono text-xs">{row.seed.code}</TableCell>
                  <TableCell className="font-medium">{row.seed.name}</TableCell>
                  <TableCell>{row.seed.category}</TableCell>
                  <TableCell>
                    {formatBillingUnit(row.service?.billing_unit ?? row.seed.billing_unit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="ml-auto h-8 w-28 text-right"
                        value={draft}
                        onChange={(e) =>
                          setPriceDrafts((d) => ({
                            ...d,
                            [row.seed.code]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{Number(draft).toFixed(2)}</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingCode === row.seed.code}
                        onClick={() => void saveAutoPrice(row)}
                      >
                        {row.service ? "Save" : "Create"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-[var(--outline)] bg-white">
        {loading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No services"
            description="Add billable services for the finance team."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Billing unit</TableHead>
                <TableHead className="text-right">Unit price</TableHead>
                {canManage && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.code}</TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.category || "—"}</TableCell>
                  <TableCell>{formatBillingUnit(s.billing_unit)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(s.unit_price).toFixed(2)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(s)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void remove(s)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit service" : "New service"}
      >
        <div className="space-y-3">
          {form.category?.toLowerCase() === "lab" && (
            <div className="space-y-1 rounded-md border border-gray-200 bg-gray-50 p-3">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Pick a lab test</span>
                <Input
                  value={loincQuery}
                  onChange={(e) => setLoincQuery(e.target.value)}
                  placeholder="Search LOINC code or name…"
                />
              </label>
              {loincLoading ? (
                <p className="text-xs text-gray-400">Searching…</p>
              ) : loincSearched && loincResults.length === 0 ? (
                <p className="text-xs text-gray-400">No matches.</p>
              ) : (
                loincResults.length > 0 && (
                  <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 bg-white">
                    {loincResults.map((loinc) => (
                      <li key={loinc.code}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => applyLoinc(loinc)}
                        >
                          <span className="truncate">{loinc.display_name}</span>
                          <span className="shrink-0 font-mono text-xs text-gray-400">
                            {loinc.code}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          )}
          {(
            [
              ["code", "Code"],
              ["name", "Name"],
              ["category", "Category"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1 text-sm">
              <span className="font-medium">{label}</span>
              <Input
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </label>
          ))}
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Billing unit</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.billing_unit}
              onChange={(e) =>
                setForm((f) => ({ ...f, billing_unit: e.target.value }))
              }
            >
              <option value="">—</option>
              {BILLING_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {formatBillingUnit(unit)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Unit price</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.unit_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, unit_price: e.target.value }))
              }
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void save()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
