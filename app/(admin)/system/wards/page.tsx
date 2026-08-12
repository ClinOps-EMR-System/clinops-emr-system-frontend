"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { adminApi } from "@/lib/services/admin";
import type { Ward } from "@/types/admin";
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

const WARD_TYPES = [
  "General",
  "ICU",
  "HDU",
  "Maternity",
  "Paediatric",
  "Isolation",
  "Surgical",
  "Medical",
  "Emergency",
  "Observation",
];

export default function WardsPage() {
  usePageTitle("Wards & Beds");
  const { token } = useAuth();
  const { can } = usePermissions();
  const canEdit = can("ward.edit");
  const [items, setItems] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ward | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    ward_type: "General",
    total_beds: "0",
  });
  const [pendingDelete, setPendingDelete] = useState<Ward | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.listWards(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load wards");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", ward_type: "General", total_beds: "0" });
    setOpen(true);
  };

  const openEdit = (w: Ward) => {
    setEditing(w);
    setForm({
      name: w.name,
      code: w.code,
      ward_type: w.ward_type,
      total_beds: String(w.total_beds),
    });
    setOpen(true);
  };

  const save = async () => {
    const body = {
      name: form.name,
      code: form.code,
      ward_type: form.ward_type,
      total_beds: Number(form.total_beds) || 0,
    };
    try {
      if (editing) await adminApi.updateWard(token, editing.id, body);
      else await adminApi.createWard(token, body);
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (w: Ward) => {
    try {
      await adminApi.deleteWard(token, w.id);
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
          <h1 className="text-xl font-semibold tracking-tight">Wards & beds</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Inpatient layout used by admissions. Bed occupancy still updates
            through clinical workflows.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New ward
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
            title="No wards"
            description="Create wards to support inpatient admissions."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Beds</TableHead>
                {canEdit && (
                  <TableHead className="text-right">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="font-mono text-xs">{w.code}</TableCell>
                  <TableCell>{w.ward_type}</TableCell>
                  <TableCell className="tabular-nums">
                    {w.beds_count ?? w.total_beds}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(w)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(w)}
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
        title={editing ? "Edit ward" : "New ward"}
      >
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Name</span>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Code</span>
            <Input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Type</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.ward_type}
              onChange={(e) =>
                setForm((f) => ({ ...f, ward_type: e.target.value }))
              }
            >
              {WARD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Total beds</span>
            <Input
              type="number"
              min={0}
              value={form.total_beds}
              onChange={(e) =>
                setForm((f) => ({ ...f, total_beds: e.target.value }))
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void (pendingDelete && remove(pendingDelete))}
        title={`Delete ward ${pendingDelete?.name ?? ""}?`}
        message="Admissions linked to this ward will need a new ward assignment."
        confirmLabel="Delete ward"
        variant="danger"
      />
    </div>
  );
}
