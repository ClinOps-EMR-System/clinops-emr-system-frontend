"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";

interface SystemUser {
  id: number;
  name: string;
  email: string;
  username: string;
  is_active: boolean;
  department?: { id: number; name: string };
}

export default function AdminPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "audit" | "reports">("users");

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await api.get("/users?per_page=20", token);
        if (response?.data) setUsers(response.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchUsers();
  }, [token]);

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      <div>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Administration</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">System Administration</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Manage users, roles, audit logs, and system reports.</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: "users", label: "User Management", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" },
            { key: "audit", label: "Audit Log", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { key: "reports", label: "Reports", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "border-brand-green text-brand-green"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={tab.icon} />
              </svg>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "users" && (
        <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-brand-green rounded-full"></div>
              <h2 className="text-lg font-bold text-gray-900">Staff Accounts</h2>
            </div>
            <span className="text-xs text-gray-500 font-mono">{users.length} users</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500 font-mono">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#fcf9f8]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#fcf9f8]/40">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.department?.name || "--"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "audit" && (
        <div className="bg-white rounded border border-[#becab7]/50 p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p className="text-sm text-gray-400">Audit log viewer — coming soon.</p>
          <p className="text-xs text-gray-400 mt-1">All system actions are timestamped and traceable.</p>
        </div>
      )}

      {activeTab === "reports" && (
        <div className="bg-white rounded border border-[#becab7]/50 p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-gray-400">Reports dashboard — coming soon.</p>
          <p className="text-xs text-gray-400 mt-1">Clinical activity, registration trends, and operational KPIs.</p>
        </div>
      )}
    </div>
  );
}
