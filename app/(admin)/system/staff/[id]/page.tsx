"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AdminUser, Cadre, Department } from "@/types/admin";
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cadres, setCadres] = useState<Cadre[]>([]);
  const [deptUsers, setDeptUsers] = useState<AdminUser[]>([]);
  const [supervision, setSupervision] = useState<{
    supervisor: AdminUser | null;
    supervisees: AdminUser[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    department_id: "",
    cadre_id: "",
    rank_id: "",
    supervisor_id: "",
    is_active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, , d, c] = await Promise.all([
        adminApi.getUser(token, id),
        Promise.resolve([]),
        adminApi.listDepartments(token),
        adminApi.listCadres(token),
      ]);
      setUser(u);
      setDepartments(d);
      setCadres(c);
      setForm({
        name: u.name,
        username: u.username,
        email: u.email,
        password: "",
        department_id: u.department?.id ? String(u.department.id) : "",
        cadre_id: u.cadre?.id ? String(u.cadre.id) : "",
        rank_id: u.rank?.id ? String(u.rank.id) : "",
        supervisor_id: u.supervisor?.id ? String(u.supervisor.id) : "",
        is_active: u.is_active,
      });
      const [deptRes, supervisionRes] = await Promise.all([
        adminApi.listUsers(token, {
          department_id: u.department?.id,
          per_page: 100,
        }),
        adminApi.getSupervision(token, id),
      ]);
      setDeptUsers(deptRes.data);
      setSupervision(supervisionRes);
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

  const cadreRanks = useMemo(
    () =>
      cadres.find((c) => c.id === Number(form.cadre_id))?.ranks ?? [],
    [cadres, form.cadre_id],
  );

  const selectedRankGrade = useMemo(
    () => cadreRanks.find((r) => r.id === Number(form.rank_id))?.grade,
    [cadreRanks, form.rank_id],
  );

  const supervisorCandidates = useMemo(() => {
    const cadreId = Number(form.cadre_id);
    const grade = selectedRankGrade;
    if (!cadreId || grade === undefined) return [];
    return deptUsers.filter(
      (u) =>
        u.id !== user?.id &&
        u.is_active &&
        u.cadre?.id === cadreId &&
        (u.rank?.grade ?? -1) > grade,
    );
  }, [deptUsers, form.cadre_id, selectedRankGrade, user?.id]);

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
        cadre_id: form.cadre_id ? Number(form.cadre_id) : null,
        rank_id: form.rank_id ? Number(form.rank_id) : null,
        supervisor_id: form.supervisor_id
          ? Number(form.supervisor_id)
          : null,
        is_active: form.is_active,
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
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!user || isAdminUser) return;
    try {
      await adminApi.deleteUser(token, user.id);
      router.push("/system/staff");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
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
            ["name", "Full name", "field-staff-name"],
            ["username", "Username", "field-staff-username"],
            ["email", "Email", "field-staff-email"],
            ["password", "New password (optional)", "field-staff-password"],
          ] as const
        ).map(([key, label, fieldId]) => (
          <label key={key} htmlFor={fieldId} className="block space-y-1 text-sm">
            <span className="font-medium">{label}</span>
            <Input
              id={fieldId}
              type={key === "password" ? "password" : "text"}
              disabled={isAdminUser}
              value={form[key]}
              onChange={(e) =>
                setForm((f) => ({ ...f, [key]: e.target.value }))
              }
            />
          </label>
        ))}
        <label htmlFor="field-staff-department" className="block space-y-1 text-sm">
          <span className="font-medium">Department</span>
          <select
            id="field-staff-department"
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
        <label htmlFor="field-staff-cadre" className="block space-y-1 text-sm">
          <span className="font-medium">Cadre</span>
          <select
            id="field-staff-cadre"
            disabled={isAdminUser}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60"
            value={form.cadre_id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                cadre_id: e.target.value,
                rank_id: "",
                supervisor_id: "",
              }))
            }
          >
            <option value="">None</option>
            {cadres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="field-staff-rank" className="block space-y-1 text-sm">
          <span className="font-medium">Rank</span>
          <select
            id="field-staff-rank"
            disabled={isAdminUser || !form.cadre_id}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60"
            value={form.rank_id}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                rank_id: e.target.value,
                supervisor_id: "",
              }))
            }
          >
            <option value="">None</option>
            {cadreRanks.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="field-staff-supervisor" className="block space-y-1 text-sm">
          <span className="font-medium">Supervisor</span>
          <select
            id="field-staff-supervisor"
            disabled={isAdminUser || !form.cadre_id || !form.rank_id}
            className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm disabled:opacity-60"
            value={form.supervisor_id}
            onChange={(e) =>
              setForm((f) => ({ ...f, supervisor_id: e.target.value }))
            }
          >
            <option value="">None</option>
            {supervisorCandidates.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.rank?.name || "No rank"}
              </option>
            ))}
          </select>
          {form.cadre_id && form.rank_id && supervisorCandidates.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              No active senior staff in this department/cadre.
            </p>
          )}
        </label>
        <label htmlFor="field-staff-role" className="block space-y-1 text-sm">
          <span className="font-medium">Role (derived from cadre)</span>
          <input
            id="field-staff-role"
            type="text"
            readOnly
            className="h-10 w-full rounded-md border border-input bg-gray-50 px-3 text-sm text-muted-foreground"
            value={
              form.cadre_id
                ? cadres.find((c) => c.id === Number(form.cadre_id))
                    ?.default_role || "—"
                : user?.roles?.[0]?.name || "—"
            }
          />
        </label>
        <label htmlFor="field-staff-is-active" className="flex items-center gap-2 text-sm">
          <input
            id="field-staff-is-active"
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

      {supervision && (
        <div className="space-y-3 rounded-lg border border-[var(--outline)] bg-white p-4">
          <h2 className="text-sm font-semibold">Supervision</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Reports to
              </p>
              <p className="mt-0.5">
                {supervision.supervisor?.name || "None"}
                {supervision.supervisor?.email && (
                  <span className="block font-mono text-xs text-muted-foreground">
                    {supervision.supervisor.email}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Supervisees ({supervision.supervisees.length})
              </p>
              {supervision.supervisees.length > 0 ? (
                <ul className="mt-0.5 list-inside list-disc text-[var(--clinical-primary)]">
                  {supervision.supervisees.map((s) => (
                    <li key={s.id}>{s.name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-0.5">None</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" nativeButton={false} render={<Link href={`/system/staff/${id}/activity`} />}>
          View Activity
        </Button>
        {!isAdminUser && (
          <>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            <Button variant="destructive" onClick={() => void remove()}>
              Delete user
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void confirmDelete()}
        title="Delete user?"
        message={`This will permanently delete ${user?.name ?? "this user"}. This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete user"
      />
    </div>
  );
}
