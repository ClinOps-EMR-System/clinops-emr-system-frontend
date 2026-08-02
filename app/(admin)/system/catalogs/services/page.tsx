"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { adminApi } from "@/lib/services/admin";
import type { BillableService } from "@/types/admin";
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
    unit_price: "",
  });

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

  useEffect(() => {
    if (token) {
      const t = setTimeout(() => void load(), 0);
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
    setForm({ code: "", name: "", category: "", unit_price: "" });
    setOpen(true);
  };

  const openEdit = (s: BillableService) => {
    setEditing(s);
    setForm({
      code: s.code,
      name: s.name,
      category: s.category || "",
      unit_price: String(s.unit_price),
    });
    setOpen(true);
  };

  const save = async () => {
    const body = {
      code: form.code,
      name: form.name,
      category: form.category || null,
      unit_price: Number(form.unit_price) || 0,
    };
    try {
      if (editing) await adminApi.updateService(token, editing.id, body);
      else await adminApi.createService(token, body);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (s: BillableService) => {
    if (!confirm(`Delete service ${s.name}?`)) return;
    try {
      await adminApi.deleteService(token, s.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
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
          {(
            [
              ["code", "Code"],
              ["name", "Name"],
              ["category", "Category"],
              ["unit_price", "Unit price"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1 text-sm">
              <span className="font-medium">{label}</span>
              <Input
                type={key === "unit_price" ? "number" : "text"}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [key]: e.target.value }))
                }
              />
            </label>
          ))}
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
