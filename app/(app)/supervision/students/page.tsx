"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import StatusBadge from "@/components/ui/StatusBadge";
import { Search, TriangleAlert, ShieldCheck, UserRoundX } from "lucide-react";

interface Candidate {
  id: number;
  name: string;
  email: string;
}

interface StudentRow {
  id: number;
  name: string;
  email: string;
  username: string | null;
  department: { id: number; name: string } | null;
  cadre: { id: number; name: string } | null;
  rank: { id: number; name: string; grade: number } | null;
  supervisor: Candidate | null;
  candidates: Candidate[];
}

export default function SupervisionStudentsPage() {
  const { token } = useAuth();
  const { can } = usePermissions();

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/supervision/students", token);
      setStudents(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (token) void load();
  }, [token, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
    );
  }, [students, search]);

  const assign = async (studentId: number, supervisorId: number | null) => {
    setSavingId(studentId);
    setError(null);
    try {
      await api.put(`/users/${studentId}/supervisor`, { supervisor_id: supervisorId }, token);
      setStudents((prev) =>
        prev.map((s) => {
          if (s.id !== studentId) return s;
          const supervisor =
            supervisorId === null
              ? null
              : s.candidates.find((c) => c.id === supervisorId) ?? null;
          return { ...s, supervisor };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update supervisor.");
    } finally {
      setSavingId(null);
    }
  };

  if (!can("supervisor.assign")) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <span className="font-semibold">You do not have permission to assign supervisors.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Supervision — Students"
        description="Assign Medical Students to their supervising clinicians."
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 text-red-600" /> {error}
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          className="w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm shadow-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            No students found.
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{student.name}</div>
                <div className="text-xs text-muted-foreground">
                  {student.email} · {student.department?.name ?? "—"} · {student.rank?.name ?? "—"}
                </div>
                <div className="mt-1">
                  {student.supervisor ? (
                    <StatusBadge label={`Supervisor: ${student.supervisor.name}`} variant="success" />
                  ) : (
                    <StatusBadge label="No supervisor assigned" variant="warning" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={student.supervisor?.id ? String(student.supervisor.id) : ""}
                  disabled={savingId === student.id}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) void assign(student.id, Number(value));
                  }}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Assign supervisor…</option>
                  {student.candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
                {student.supervisor && (
                  <button
                    type="button"
                    disabled={savingId === student.id}
                    onClick={() => void assign(student.id, null)}
                    className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-2 text-xs font-medium text-destructive shadow-sm hover:bg-destructive/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <UserRoundX className="h-4 w-4" />
                    Unassign
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
