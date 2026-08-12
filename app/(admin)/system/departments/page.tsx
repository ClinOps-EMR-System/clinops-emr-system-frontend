"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { Department } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
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

export default function DepartmentsPage() {
  usePageTitle("Departments");
  const { token } = useAuth();
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    is_active: true,
  });
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await adminApi.listDepartments(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load departments");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "", is_active: true });
    setOpen(true);
  };

  const openEdit = (d: Department) => {
    setEditing(d);
    setForm({
      name: d.name,
      code: d.code,
      description: d.description || "",
      is_active: d.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await adminApi.updateDepartment(token, editing.id, form);
      } else {
        await adminApi.createDepartment(token, form);
      }
      setOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (d: Department) => {
    try {
      await adminApi.deleteDepartment(token, d.id);
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
          <h1 className="text-xl font-semibold tracking-tight">Departments</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Internal hospital departments used for staff assignment and
            appointments.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New department
        </Button>
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
            title="No departments"
            description="Add departments so staff can be assigned to them."
            action={
              <Button size="sm" onClick={openCreate}>
                New department
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  <TableCell className="font-mono text-xs">{d.code}</TableCell>
                  <TableCell>
                    <StatusBadge
                      label={d.is_active ? "Active" : "Inactive"}
                      variant={d.is_active ? "success" : "neutral"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(d)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(d)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit department" : "New department"}
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
            <span className="font-medium">Description</span>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm((f) => ({ ...f, is_active: e.target.checked }))
              }
            />
            Active
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
        title={`Delete department ${pendingDelete?.name ?? ""}?`}
        message="Staff assigned to this department will no longer be linked to it."
        confirmLabel="Delete department"
        variant="danger"
      />
    </div>
  );
}
