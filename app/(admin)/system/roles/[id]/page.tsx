"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AdminPermission, AdminRole } from "@/types/admin";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function RoleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p] = await Promise.all([
        adminApi.getRole(token, id),
        adminApi.listPermissions(token),
      ]);
      setRole(r);
      setPermissions(p);
      setName(r.name);
      setDescription(r.description || "");
      setSelected((r.permissions || []).map((x) => x.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load role");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const isAdminRole = role?.name === "Admin";

  const save = async () => {
    if (!role || isAdminRole) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await adminApi.updateRole(token, role.id, {
        name,
        description: description || undefined,
      });
      await adminApi.syncRolePermissions(token, role.id, selected);
      setSaved(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <p className="text-sm text-[var(--color-clinical-error)]">
        {error || "Role not found"}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/system/roles"
          className="text-xs font-medium text-[var(--clinical-primary)]"
        >
          ← Roles
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{role.name}</h1>
        <p className="mt-1 text-sm text-[var(--clinical-muted)]">
          Toggle permissions by domain. Changes apply to every user with this
          role.
        </p>
      </div>

      {isAdminRole && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          The Admin role holds all permissions and cannot be edited here.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-[var(--clinical-primary)]">
          Role and permissions saved.
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-[var(--outline)] bg-white p-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Name</span>
          <Input
            disabled={isAdminRole}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Description</span>
          <Input
            disabled={isAdminRole}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <PermissionMatrix
        permissions={permissions}
        selected={selected}
        onChange={setSelected}
        disabled={isAdminRole}
      />

      {!isAdminRole && (
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save role & permissions"}
        </Button>
      )}
    </div>
  );
}
