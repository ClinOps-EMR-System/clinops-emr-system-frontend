"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AdminRole, AdminUser, Department } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    department_id: "",
    role: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r, d] = await Promise.all([
        adminApi.getUser(token, id),
        adminApi.listRoles(token),
        adminApi.listDepartments(token),
      ]);
      setUser(u);
      setRoles(r.filter((x) => x.name !== "Admin"));
      setDepartments(d);
      setForm({
        name: u.name,
        username: u.username,
        email: u.email,
        password: "",
        department_id: u.department?.id ? String(u.department.id) : "",
        role: u.roles?.[0]?.name && u.roles[0].name !== "Admin" ? u.roles[0].name : "",
        is_active: u.is_active,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const isAdminUser = (user?.roles || []).some((r) => r.name === "Admin");

  const save = async () => {
    if (!user || isAdminUser) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        username: form.username,
        email: form.email,
        department_id: form.department_id
          ? Number(form.department_id)
          : null,
        is_active: form.is_active,
        roles: form.role ? [form.role] : [],
      };
      if (form.password) body.password = form.password;
      await adminApi.updateUser(token, user.id, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!user || isAdminUser) return;
    try {
      await adminApi.deleteUser(token, user.id);
      router.push("/system/staff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-[var(--color-clinical-error)]">
          {error || "User not found"}
        </p>
        <Button className="mt-4" variant="outline" nativeButton={false} render={<Link href="/system/staff" />}>
          Back to staff
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/system/staff"
            className="text-xs font-medium text-[var(--clinical-primary)]"
          >
            ← Staff
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {user.name}
          </h1>
          <div className="mt-2">
            <StatusBadge
              label={user.is_active ? "Active" : "Inactive"}
              variant={user.is_active ? "success" : "neutral"}
            />
          </div>
        </div>
      </div>

      {isAdminUser && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This is an Admin account. Manage it with{" "}
          <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
            php artisan clinops:create-admin
          </code>{" "}
          — the panel cannot edit Admin roles.
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--color-clinical-error)]">
          {error}
        </div>
      )}

      <div className="space-y-3 rounded-lg border border-[var(--outline)] bg-white p-4">
        {(
          [
            ["name", "Full name"],
            ["username", "Username"],
            ["email", "Email"],
            ["password", "New password (optional)"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            <Input
              type={key === "password" ? "password" : "text"}
              disabled={isAdminUser}
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
            />
          </label>
        ))}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Department</span>
          <select
            disabled={isAdminUser}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60"
            value={form.department_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, department_id: e.target.value }))
            }
          >
            <option value="">None</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Role</span>
          <select
            disabled={isAdminUser}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="">None</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            disabled={isAdminUser}
            checked={form.is_active}
            onChange={(e) =>
              setForm((f) => ({ ...f, is_active: e.target.checked }))
            }
          />
          Active account
        </label>
      </div>

      {!isAdminUser && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
            Delete user
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void remove()}
        title={`Delete ${user.name}?`}
        message="This user account will be permanently removed and cannot be undone."
        confirmLabel="Delete user"
        variant="danger"
      />
    </div>
  );
}
