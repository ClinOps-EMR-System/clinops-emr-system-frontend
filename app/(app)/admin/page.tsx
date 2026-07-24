"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import Modal from "../../../components/ui/Modal";
import { Users, Search, Plus, Shield, Edit } from "lucide-react";

interface UserRecord {
  id: number;
  name: string;
  username: string;
  email: string;
  is_active: boolean;
  role?: string;
  department?: { id: number; name: string };
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions?: { id: number; name: string }[];
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
  const [createRoleModal, setCreateRoleModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", username: "", email: "", password: "", role: "", department_id: "" });
  const [roleForm, setRoleForm] = useState({ name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, rolesRes] = await Promise.allSettled([
        api.get("/users", token),
        api.get("/roles", token),
      ]);
      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        const userData = usersRes.value.data;
        setUsers(Array.isArray(userData) ? userData : userData.data || []);
      }
      if (rolesRes.status === "fulfilled" && rolesRes.value?.data) {
        const rolesData = rolesRes.value.data;
        setRoles(Array.isArray(rolesData) ? rolesData : rolesData.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (token) fetchData(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredUsers = users.filter((u) => {
    return !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/users", {
        name: userForm.name,
        username: userForm.username,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role || undefined,
        department_id: userForm.department_id ? parseInt(userForm.department_id) : undefined,
      }, token);
      setCreateUserModal(false);
      setUserForm({ name: "", username: "", email: "", password: "", role: "", department_id: "" });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/roles", { name: roleForm.name, description: roleForm.description || null }, token);
      setCreateRoleModal(false);
      setRoleForm({ name: "", description: "" });
      fetchData();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 404) {
        setError("Role management is not yet configured on the backend.");
      } else {
        setError(apiError.message || "Failed to create role");
      }
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Administration</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">User & Role Management</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">Manage system users, roles, and permission assignments</p>
        </div>
      </section>

      {/* Tabs */}
      <section className="flex gap-1 bg-white rounded border border-[#becab7]/50 p-1" role="tablist" aria-label="Admin views">
        {[
          { key: "users" as const, label: "Users", icon: <Users className="h-4 w-4" /> },
          { key: "roles" as const, label: "Roles & Permissions", icon: <Shield className="h-4 w-4" /> },
        ].map((t) => (
          <button key={t.key} role="tab" aria-selected={activeTab === t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded transition-all ${activeTab === t.key ? "bg-clinical-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </section>

      {/* Users Tab */}
      {activeTab === "users" && (
        <>
          <section className="flex flex-col sm:flex-row justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search users by name or email..." aria-label="Search users" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button onClick={() => setCreateUserModal(true)} className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover transition-all">
              <Plus className="h-4 w-4 mr-2" /> Add User
            </button>
          </section>

          <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center">
              <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
              <h2 className="text-lg font-bold text-gray-900">System Users</h2>
            </div>
            {loading ? <LoadingState message="Loading users..." /> : error ? <div className="p-8 text-center text-sm text-red-600">{error}</div> : filteredUsers.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6 text-gray-400" />} title="No users found" description="Add system users to get started" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#fcf9f8]">
                    <tr className="divide-x divide-gray-200/50">
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{u.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 font-mono">{u.email}</td>
                        <td className="px-6 py-4"><StatusBadge label={u.role || "No Role"} variant="info" /></td>
                        <td className="px-6 py-4 text-sm text-gray-600">{u.department?.name || "—"}</td>
                        <td className="px-6 py-4"><StatusBadge label={u.is_active ? "Active" : "Inactive"} variant={u.is_active ? "success" : "neutral"} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <button className="text-xs font-bold text-gray-500 hover:text-gray-700 uppercase tracking-wider cursor-pointer inline-flex items-center gap-1">
                              <Edit className="h-3 w-3" /> Edit
                            </button>
                            {u.id !== user?.id && (
                              <button onClick={() => handleToggleActive(u.id, u.is_active)} className={`text-xs font-bold uppercase tracking-wider cursor-pointer ${u.is_active ? "text-red-600 hover:text-red-800" : "text-emerald-600 hover:text-emerald-800"}`}>
                                {u.is_active ? "Deactivate" : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <>
          <section className="flex justify-end">
            <button onClick={() => setCreateRoleModal(true)} className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover transition-all">
              <Plus className="h-4 w-4 mr-2" /> Add Role
            </button>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? <LoadingState message="Loading roles..." /> : roles.length === 0 ? (
              <EmptyState icon={<Shield className="h-6 w-6 text-gray-400" />} title="No roles configured" description="Create roles to manage permissions" />
            ) : roles.map((role) => (
              <div key={role.id} className="bg-white rounded border border-[#becab7]/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900">{role.name}</h3>
                  <StatusBadge label={`${role.permissions?.length || 0} perms`} variant="info" />
                </div>
                {role.description && <p className="text-xs text-gray-500 mb-3">{role.description}</p>}
                {role.permissions && role.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.slice(0, 6).map((p) => (
                      <span key={p.id} className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{p.name}</span>
                    ))}
                    {role.permissions.length > 6 && <span className="text-[10px] font-mono text-gray-400">+{role.permissions.length - 6} more</span>}
                  </div>
                )}
              </div>
            ))}
          </section>
        </>
      )}

      {/* Create User Modal */}
      <Modal open={createUserModal} onClose={() => setCreateUserModal(false)} title="Add User" subtitle="Create a new system user" footer={
        <>
          <button onClick={() => setCreateUserModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreateUser} disabled={submitting || !userForm.name || !userForm.email || !userForm.password} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">{submitting ? "Creating..." : "Create User"}</button>
        </>
      }>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Full Name *</label>
              <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Username *</label>
              <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Email *</label>
            <input type="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Password *</label>
            <input type="password" required minLength={8} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Role</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
                <option value="">Select role</option>
                {roles.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Department ID</label>
              <input type="number" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={userForm.department_id} onChange={(e) => setUserForm({ ...userForm, department_id: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>

      {/* Create Role Modal */}
      <Modal open={createRoleModal} onClose={() => setCreateRoleModal(false)} title="Add Role" footer={
        <>
          <button onClick={() => setCreateRoleModal(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleCreateRole} disabled={submitting || !roleForm.name} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">{submitting ? "Creating..." : "Create Role"}</button>
        </>
      }>
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Role Name *</label>
            <input type="text" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} placeholder="e.g., Senior Nurse" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Description</label>
            <textarea rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} placeholder="Brief description of this role" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
