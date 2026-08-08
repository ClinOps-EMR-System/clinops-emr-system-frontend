"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import Modal from "@/components/ui/Modal";
import {
  Pill,
  Clock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  PauseCircle,
  SkipForward,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

interface Drug {
  id: number;
  name: string;
  strength: string | null;
  formulation: string | null;
}

interface Prescription {
  id: number;
  dosage: string;
  frequency: string | null;
  route: string | null;
  status: string;
  drug: Drug | null;
  prescribedBy: { id: number; name: string } | null;
}

interface Administration {
  id: number;
  prescription_id: number;
  administered_at: string;
  status: "administered" | "refused" | "held" | "skipped";
  dose_given: string;
  site: string | null;
  notes: string | null;
  administeredBy: { id: number; name: string };
  prescription: Prescription;
}

interface MarData {
  administrations: Administration[];
  prescriptions: Prescription[];
}

const statusColors: Record<string, string> = {
  administered: "text-emerald-600",
  refused: "text-red-600",
  held: "text-amber-600",
  skipped: "text-gray-500",
};

const statusIcons: Record<string, React.ReactNode> = {
  administered: <CheckCircle2 className="h-4 w-4" />,
  refused: <XCircle className="h-4 w-4" />,
  held: <PauseCircle className="h-4 w-4" />,
  skipped: <SkipForward className="h-4 w-4" />,
};

export default function MedicationAdministrationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { token } = useAuth();
  const [data, setData] = useState<MarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    status: "administered",
    dose_given: "",
    site: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/admissions/${id}/medications`, token);
      setData(res.data?.data ?? res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openAdminModal = (rx: Prescription) => {
    setSelectedPrescription(rx);
    setForm({
      status: "administered",
      dose_given: rx.dosage,
      site: "",
      notes: "",
    });
    setModalOpen(true);
  };

  const submitAdministration = async () => {
    if (!token || !selectedPrescription) return;
    setSubmitting(true);
    try {
      await api.post(
        `/admissions/${id}/medications/${selectedPrescription.id}/administer`,
        {
          status: form.status,
          dose_given: form.dose_given,
          site: form.site || null,
          notes: form.notes || null,
        },
        token,
      );
      setModalOpen(false);
      setSelectedPrescription(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record administration");
    } finally {
      setSubmitting(false);
    }
  };

  const prescriptions = data?.prescriptions ?? [];
  const administrations = data?.administrations ?? [];

  const getLatestAdmin = (rxId: number) =>
    administrations.find((a) => a.prescription_id === rxId && a.status === "administered");

  const getAdminHistory = (rxId: number) =>
    administrations.filter((a) => a.prescription_id === rxId);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link href={`/admissions/${id}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to Admission
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-destructive">{error}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/admissions/${id}`}
          className="rounded-md p-1.5 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">Medication Administration Record</h1>
          <p className="text-sm text-muted-foreground">Admission #{id}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {prescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<Pill className="h-6 w-6 text-gray-500" />}
              title="No active prescriptions"
              description="No dispensed medications found for this admission."
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Medications ({prescriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Drug</th>
                  <th className="px-4 py-2">Dose</th>
                  <th className="px-4 py-2">Route</th>
                  <th className="px-4 py-2">Frequency</th>
                  <th className="px-4 py-2">Last Given</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((rx) => {
                  const latest = getLatestAdmin(rx.id);
                  const history = getAdminHistory(rx.id);
                  const isOverdue = rx.status === "Dispensed" && !latest;

                  return (
                    <tr key={rx.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-medium">{rx.drug?.name ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">
                          {rx.drug?.strength} {rx.drug?.formulation}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{rx.dosage}</td>
                      <td className="px-4 py-3 text-xs">{rx.route || "—"}</td>
                      <td className="px-4 py-3 text-xs">{rx.frequency || "—"}</td>
                      <td className="px-4 py-3 text-xs">
                        {latest ? (
                          <div>
                            <div>{format(parseISO(latest.administered_at), "dd MMM HH:mm")}</div>
                            <div className="text-muted-foreground">
                              by {latest.administeredBy.name}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isOverdue ? (
                          <StatusBadge label="Overdue" variant="error" pulse />
                        ) : latest ? (
                          <span className={`flex items-center gap-1 text-xs font-medium ${statusColors[latest.status]}`}>
                            {statusIcons[latest.status]}
                            {latest.status}
                          </span>
                        ) : rx.status === "Dispensed" ? (
                          <StatusBadge label="Pending" variant="warning" />
                        ) : (
                          <StatusBadge label={rx.status} variant="neutral" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {rx.status === "Dispensed" && (
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => openAdminModal(rx)}>
                              Record
                            </Button>
                            {history.length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  const el = document.getElementById(`history-${rx.id}`);
                                  el?.classList.toggle("hidden");
                                }}
                              >
                                {history.length}x
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {administrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Administration History
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Drug</th>
                  <th className="px-4 py-2">Dose</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Site</th>
                  <th className="px-4 py-2">Notes</th>
                  <th className="px-4 py-2">Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {administrations.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-xs">
                      {format(parseISO(a.administered_at), "dd MMM yyyy HH:mm")}
                    </td>
                    <td className="px-4 py-3 font-medium">{a.prescription?.drug?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.dose_given}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 text-xs font-medium ${statusColors[a.status]}`}>
                        {statusIcons[a.status]}
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{a.site || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                      {a.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">{a.administeredBy.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Administration">
        <div className="space-y-4 p-4">
          {selectedPrescription && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium">{selectedPrescription.drug?.name}</div>
              <div className="text-xs text-muted-foreground">
                {selectedPrescription.dosage} — {selectedPrescription.frequency}
              </div>
            </div>
          )}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Status</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="administered">Administered</option>
              <option value="refused">Refused</option>
              <option value="held">Held</option>
              <option value="skipped">Skipped</option>
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Dose Given</span>
            <Input
              value={form.dose_given}
              onChange={(e) => setForm((f) => ({ ...f, dose_given: e.target.value }))}
              placeholder="e.g. 500mg"
            />
          </label>

          {form.status === "administered" && (
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Injection Site (optional)</span>
              <Input
                value={form.site}
                onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                placeholder="e.g. Left deltoid"
              />
            </label>
          )}

          <label className="block space-y-1 text-sm">
            <span className="font-medium">Notes (optional)</span>
            <Input
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Reason for refusal/hold, adverse reaction, etc."
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button disabled={submitting} onClick={() => void submitAdministration()}>
              {submitting ? "Saving..." : "Record"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
