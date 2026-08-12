"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { adminApi } from "@/lib/services/admin";
import type { AdminRole, AdminUser, Department } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
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
import { usePageTitle } from "@/lib/hooks/usePageTitle";

export default function StaffPage() {
  usePageTitle("Staff Management");
  const { token } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    department_id: "",
    role: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, depts] = await Promise.all([
        adminApi.listUsers(token, {
          search: search || undefined,
          role: roleFilter || undefined,
          is_active: activeFilter === "" ? undefined : activeFilter,
          per_page: 50,
        }),
        adminApi.listRoles(token),
        adminApi.listDepartments(token),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.filter((r) => r.name !== "Admin"));
      setDepartments(depts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [token, search, roleFilter, activeFilter]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setForm({
      name: "",
      username: "",
      email: "",
      password: "",
      department_id: "",
      role: "",
    });
    setFormError(null);
    setModalOpen(true);
  };

  const submitCreate = async () => {
    setSubmitting(true);
    setFormError(null);
    try {
      await adminApi.createUser(token, {
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password,
        department_id: form.department_id
          ? Number(form.department_id)
          : null,
        roles: form.role ? [form.role] : [],
        is_active: true,
      });
      setModalOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not create user");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    try {
      await adminApi.updateUser(token, user.id, {
        is_active: !user.is_active,
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
          <p className="mt-1 text-sm text-[var(--clinical-muted)]">
            Create clinical accounts and assign roles. Admin accounts are created
            via artisan only.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New staff
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, email, username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-white px-3 text-sm"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
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
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            title="No staff found"
            description="Create a staff account or adjust your filters."
            action={
              <Button size="sm" onClick={openCreate}>
                New staff
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isAdminUser = (user.roles || []).some(
                  (r) => r.name === "Admin",
                );
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        href={`/system/staff/${user.id}`}
                        className="font-medium text-[var(--clinical-primary)] hover:underline"
                      >
                        {user.name}
                      </Link>
                      <p className="font-mono text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {user.email}
                    </TableCell>
                    <TableCell>{user.department?.name || "—"}</TableCell>
                    <TableCell>
                      {(user.roles || []).map((r) => r.name).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={user.is_active ? "Active" : "Inactive"}
                        variant={user.is_active ? "success" : "neutral"}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/system/staff/${user.id}`} />}>
                          Edit
                        </Button>
                        {!isAdminUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void toggleActive(user)}
                          >
                            {user.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create staff account"
      >
        <div className="space-y-3">
          {formError && (
            <p className="text-sm text-[var(--color-clinical-error)]">
              {formError}
            </p>
          )}
          {(
            [
              ["name", "Full name"],
              ["username", "Username"],
              ["email", "Email"],
              ["password", "Temporary password"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block space-y-1 text-sm">
              <span className="font-medium">{label}</span>
              <Input
                type={key === "password" ? "password" : "text"}
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
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
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
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value }))
              }
            >
              <option value="">None</option>
              {roles.map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={() => void submitCreate()}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
