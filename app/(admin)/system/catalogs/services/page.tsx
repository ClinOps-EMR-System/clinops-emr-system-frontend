"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { adminApi } from "@/lib/services/admin";
import type { BillableService } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

export default function ServicesCatalogPage() {
  usePageTitle("Billable Services");
  const { token } = useAuth();
  const { can } = usePermissions();
  const canManage = can("catalog.manage");
  const [items, setItems] = useState<BillableService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<BillableService | null>(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    unit_price: "",
  });
  const [pendingDelete, setPendingDelete] = useState<BillableService | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.listServices(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

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
    try {
      await adminApi.deleteService(token, s.id);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setPendingDelete(null);
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
        {canManage && (
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New service
          </Button>
        )}
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
                          onClick={() => setPendingDelete(s)}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void (pendingDelete && remove(pendingDelete))}
        title={`Delete service ${pendingDelete?.name ?? ""}?`}
        message="This billable service will be permanently removed from the catalog."
        confirmLabel="Delete service"
        variant="danger"
      />
    </div>
  );
}
