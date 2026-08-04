"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AdminRole } from "@/types/admin";
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

export default function RolesPage() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRoles(await adminApi.listRoles(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roles");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const create = async () => {
    setSubmitting(true);
    try {
      await adminApi.createRole(token, { name, description: description || undefined });
      setModalOpen(false);
      setName("");
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (role: AdminRole) => {
    if (role.name === "Admin") return;
    if (!confirm(`Delete role ${role.name}?`)) return;
    try {
      await adminApi.deleteRole(token, role.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Roles</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Define roles and open a role to edit its permission matrix.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          New role
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
            <Skeleton className="h-10 w-full" />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState
            title="No roles"
            description="Create a role, then assign permissions."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/system/roles/${role.id}`}
                      className="text-[var(--clinical-primary)] hover:underline"
                    >
                      {role.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {role.description || "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {role.permissions?.length ?? 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/system/roles/${role.id}`} />}>
                        Edit
                      </Button>
                      {role.name !== "Admin" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void remove(role)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create role"
      >
        <div className="space-y-3">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Description</span>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting || !name} onClick={() => void create()}>
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
