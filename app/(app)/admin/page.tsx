"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy /admin → dedicated System Admin shell */
export default function LegacyAdminRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system");
  }, [router]);
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import { SectionHeader } from "../../../components/ui/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import EmptyState from "../../../components/ui/EmptyState";
import Modal from "../../../components/ui/Modal";
import { Users, Shield, Search, Plus, Edit, Trash2 } from "lucide-react";

interface UserRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  is_active: boolean;
  roles?: { id: number; name: string }[];
  department?: { id: number; name: string };
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions?: { id: number; name: string }[];
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminPage() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [createUserModal, setCreateUserModal] = useState(false);
  const [editUserModal, setEditUserModal] = useState(false);
  const [createRoleModal, setCreateRoleModal] = useState(false);
  const [editRoleModal, setEditRoleModal] = useState(false);
  const [assignRoleModal, setAssignRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [userForm, setUserForm] = useState({ name: "", username: "", email: "", password: "", department_id: "" });
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [assignRoleForm, setAssignRoleForm] = useState({ role: "" });

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.allSettled([
        api.get("/users", token),
        api.get("/roles", token),
      ]);
      if (usersRes.status === "fulfilled") {
        const d = usersRes.value;
        setUsers(Array.isArray(d) ? d : d.data ?? []);
      }
      if (rolesRes.status === "fulfilled") {
        const d = rolesRes.value;
        setRoles(Array.isArray(d) ? d : d.data ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const filteredUsers = users.filter((u) =>
    !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/users", {
        name: userForm.name,
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        department_id: userForm.department_id ? parseInt(userForm.department_id) : undefined,
      }, token);
      setCreateUserModal(false);
      setUserForm({ name: "", username: "", email: "", password: "", department_id: "" });
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Record<string, string[]> };
      setError(e.message || Object.values(e.errors ?? {})[0]?.[0] || "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: userForm.name,
        email: userForm.email,
      };
      if (userForm.password) payload.password = userForm.password;
      await api.put(`/users/${selectedUser.id}`, payload, token);
      setEditUserModal(false);
      setSelectedUser(null);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Record<string, string[]> };
      setError(e.message || Object.values(e.errors ?? {})[0]?.[0] || "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: number, currentStatus: boolean) => {
    try {
      await api.put(`/users/${userId}`, { is_active: !currentStatus }, token);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const handleCreateRole = async () => {
    if (!roleForm.name) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/roles", { name: roleForm.name, description: roleForm.description || null }, token);
      setCreateRoleModal(false);
      setRoleForm({ name: "", description: "" });
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Record<string, string[]> };
      setError(e.message || Object.values(e.errors ?? {})[0]?.[0] || "Failed to create role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRole = async () => {
    if (!selectedRole) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/roles/${selectedRole.id}`, { name: roleForm.name, description: roleForm.description || null }, token);
      setEditRoleModal(false);
      setSelectedRole(null);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Record<string, string[]> };
      setError(e.message || Object.values(e.errors ?? {})[0]?.[0] || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await api.delete(`/roles/${roleId}`, token);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || "Failed to delete role");
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assignRoleForm.role) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.put(`/users/${selectedUser.id}`, { role: assignRoleForm.role }, token);
      setAssignRoleModal(false);
      setSelectedUser(null);
      fetchData();
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Record<string, string[]> };
      setError(e.message || Object.values(e.errors ?? {})[0]?.[0] || "Failed to assign role");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditUser = (u: UserRecord) => {
    setSelectedUser(u);
    setUserForm({ name: u.name, username: u.username, email: u.email, password: "", department_id: "" });
    setEditUserModal(true);
  };

  const openEditRole = (r: Role) => {
    setSelectedRole(r);
    setRoleForm({ name: r.name, description: r.description ?? "" });
    setEditRoleModal(true);
  };

  const openAssignRole = (u: UserRecord) => {
    setSelectedUser(u);
    setAssignRoleForm({ role: u.roles?.[0]?.name ?? "" });
    setAssignRoleModal(true);
  };

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
      Redirecting to System Admin…
    </div>
  );
}
