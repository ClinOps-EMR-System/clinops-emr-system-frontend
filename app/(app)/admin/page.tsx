"use client";

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

interface Permission {
  id: number;
  name: string;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminPage() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [, setPermissions] = useState<Permission[]>([]);
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
      const [usersRes, rolesRes, permsRes] = await Promise.allSettled([
        api.get("/users", token),
        api.get("/roles", token),
        api.get("/permissions", token),
      ]);
      if (usersRes.status === "fulfilled") {
        const d = usersRes.value;
        setUsers(Array.isArray(d) ? d : d.data ?? []);
      }
      if (rolesRes.status === "fulfilled") {
        const d = rolesRes.value;
        setRoles(Array.isArray(d) ? d : d.data ?? []);
      }
      if (permsRes.status === "fulfilled") {
        const d = permsRes.value;
        setPermissions(Array.isArray(d) ? d : d.data ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
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
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="User & Role Management"
        description="Manage system users, roles, and permission assignments"
      />

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg" role="tablist">
        {[
          { key: "users" as const, label: "Users", icon: Users },
          { key: "roles" as const, label: "Roles & Permissions", icon: Shield },
        ].map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
              activeTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <>
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-background border-input/60 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors" />
            </div>
            <Button onClick={() => setCreateUserModal(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              Add User
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Users</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {loading ? (
                <div className="px-6 py-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="hidden lg:table-cell">Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }, (_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                          <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12">
                  <EmptyState icon={<Users className="h-6 w-6 text-muted-foreground/40" />} title="No users found" description="Add system users to get started" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden lg:table-cell">Department</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-sm">{u.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles && u.roles.length > 0 ? (
                              u.roles.map((r) => <StatusBadge key={r.id} label={r.name} variant="info" />)
                            ) : (
                              <StatusBadge label="No Role" variant="neutral" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{u.department?.name || "—"}</TableCell>
                        <TableCell>
                          <StatusBadge label={u.is_active ? "Active" : "Inactive"} variant={u.is_active ? "success" : "neutral"} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEditUser(u)}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => openAssignRole(u)}>
                              <Shield className="h-3.5 w-3.5" />
                            </Button>
                            {u.id !== user?.id && (
                              <Button size="sm" variant="ghost" onClick={() => handleToggleActive(u.id, u.is_active)}>
                                {u.is_active ? <Trash2 className="h-3.5 w-3.5 text-destructive" /> : "Activate"}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setCreateRoleModal(true)}>
              <Plus className="size-4" data-icon="inline-start" />
              Add Role
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }, (_, i) => (
                <Card key={i}>
                  <CardContent className="pt-6 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : roles.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState icon={<Shield className="h-6 w-6 text-muted-foreground/40" />} title="No roles configured" description="Create roles to manage permissions" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <Card key={role.id} className="transition-all hover:shadow-sm">
                  <CardHeader className="flex-row items-center justify-between gap-4">
                    <CardTitle className="text-sm font-semibold">{role.name}</CardTitle>
                    <StatusBadge label={`${role.permissions?.length ?? 0} perms`} variant="info" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                    {role.permissions && role.permissions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 8).map((p) => (
                          <span key={p.id} className="text-[10px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {p.name}
                          </span>
                        ))}
                        {role.permissions.length > 8 && (
                          <span className="text-[10px] font-mono text-muted-foreground">+{role.permissions.length - 8} more</span>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button size="sm" variant="ghost" onClick={() => openEditRole(role)}>
                        <Edit className="h-3.5 w-3.5" data-icon="inline-start" />
                        Edit
                      </Button>
                      {role.name !== "Admin" && (
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteRole(role.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-3.5 w-3.5" data-icon="inline-start" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create User Modal */}
      <Modal open={createUserModal} onClose={() => setCreateUserModal(false)} title="Add User" subtitle="Create a new system user"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateUserModal(false)}>Cancel</Button>
            <Button onClick={handleCreateUser} disabled={submitting || !userForm.name || !userForm.email || !userForm.password}>
              {submitting ? "Creating..." : "Create User"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name *</label>
              <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Username *</label>
              <Input value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email *</label>
            <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Password *</label>
            <Input type="password" minLength={8} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Department ID</label>
            <Input type="number" value={userForm.department_id} onChange={(e) => setUserForm({ ...userForm, department_id: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal open={editUserModal} onClose={() => { setEditUserModal(false); setSelectedUser(null); }} title="Edit User"
        footer={
          <>
            <Button variant="outline" onClick={() => { setEditUserModal(false); setSelectedUser(null); }}>Cancel</Button>
            <Button onClick={handleEditUser} disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Full Name</label>
            <Input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Email</label>
            <Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">New Password (leave blank to keep current)</label>
            <Input type="password" minLength={8} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          </div>
        </div>
      </Modal>

      {/* Assign Role Modal */}
      <Modal open={assignRoleModal} onClose={() => { setAssignRoleModal(false); setSelectedUser(null); }} title="Assign Role"
        subtitle={selectedUser ? `Assigning role to ${selectedUser.name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => { setAssignRoleModal(false); setSelectedUser(null); }}>Cancel</Button>
            <Button onClick={handleAssignRole} disabled={submitting}>{submitting ? "Saving..." : "Assign Role"}</Button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Role</label>
          <select
            className="w-full px-3 py-2 border rounded bg-white text-sm"
            value={assignRoleForm.role}
            onChange={(e) => setAssignRoleForm({ role: e.target.value })}
          >
            <option value="">Select role</option>
            {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
          </select>
        </div>
      </Modal>

      {/* Create Role Modal */}
      <Modal open={createRoleModal} onClose={() => setCreateRoleModal(false)} title="Add Role"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateRoleModal(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={submitting || !roleForm.name}>{submitting ? "Creating..." : "Create Role"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role Name *</label>
            <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g. Senior Nurse" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Brief description of this role" />
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal open={editRoleModal} onClose={() => { setEditRoleModal(false); setSelectedRole(null); }} title="Edit Role"
        footer={
          <>
            <Button variant="outline" onClick={() => { setEditRoleModal(false); setSelectedRole(null); }}>Cancel</Button>
            <Button onClick={handleEditRole} disabled={submitting}>{submitting ? "Saving..." : "Save Changes"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Role Name</label>
            <Input value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description</label>
            <Input value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
