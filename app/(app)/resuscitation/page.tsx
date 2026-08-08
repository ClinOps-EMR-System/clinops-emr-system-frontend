"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  HeartPulse,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  User,
  Pill,
  Timer,
  ArrowLeft,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

interface ResusPatient {
  id: number;
  encounter_id: number;
  patient: {
    id: number;
    hospital_number: string;
    full_name: string;
    gender: string;
  };
  severity_level: number;
  chief_complaint: string;
  team_lead: { id: number; name: string } | null;
  activated_at: string;
  wait_minutes: number;
  last_reassessed_at: string | null;
  minutes_since_reassess: number | null;
  airway_intervention: string | null;
  breathing_intervention: string | null;
  circulation_intervention: string | null;
  rhythm: string | null;
  medications_given: { drug: string; dose: string; route?: string; time: string }[];
  outcome: string;
}

interface Clinician {
  id: number;
  name: string;
}

function getSeverityBadge(level: number) {
  if (level === 1) return { label: "Level 1 - Immediate", variant: "error" as const, pulse: true };
  if (level === 2) return { label: "Level 2 - Urgent", variant: "warning" as const, pulse: true };
  return { label: `Level ${level}`, variant: "info" as const };
}

function getTimerColor(minutes: number): string {
  if (minutes >= 10) return "text-red-600 font-bold";
  if (minutes >= 5) return "text-amber-600 font-semibold";
  return "text-emerald-600";
}

function getReassessColor(minutes: number | null): string {
  if (minutes === null) return "text-muted-foreground";
  if (minutes >= 5) return "text-red-600 font-bold";
  if (minutes >= 3) return "text-amber-600";
  return "text-emerald-600";
}

export default function ResuscitationPage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<ResusPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinicians, setClinicians] = useState<Clinician[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Activate modal
  const [activateModal, setActivateModal] = useState(false);
  const [activateTarget, setActivateTarget] = useState<ResusPatient | null>(null);
  const [selectedLead, setSelectedLead] = useState<string>("");

  // Update modal
  const [updateModal, setUpdateModal] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<ResusPatient | null>(null);
  const [updateForm, setUpdateForm] = useState({
    airway_intervention: "",
    breathing_intervention: "",
    circulation_intervention: "",
    rhythm: "",
    notes: "",
  });

  // Medication modal
  const [medModal, setMedModal] = useState(false);
  const [medTarget, setMedTarget] = useState<ResusPatient | null>(null);
  const [medForm, setMedForm] = useState({ drug: "", dose: "", route: "" });

  // Outcome modal
  const [outcomeModal, setOutcomeModal] = useState(false);
  const [outcomeTarget, setOutcomeTarget] = useState<ResusPatient | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/resuscitation", token);
      setPatients(res.data?.data ?? res.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadClinicians = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get("/resuscitation/team-leads", token);
      const data = res.data?.data ?? res.data ?? [];
      const leads = Array.isArray(data)
        ? data.map((u: { id: number; name: string }) => ({ id: u.id, name: u.name }))
        : [];
      setClinicians(leads);
    } catch {
      // silent
    }
  }, [token]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
    void loadClinicians();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [load, loadClinicians]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleActivate = async () => {
    if (!token || !activateTarget || !selectedLead) return;
    setSubmitting(true);
    try {
      await api.post(`/resuscitation/${activateTarget.encounter_id}/activate`, {
        team_lead_id: Number(selectedLead),
      }, token);
      setActivateModal(false);
      setActivateTarget(null);
      setSelectedLead("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to activate");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!token || !updateTarget) return;
    setSubmitting(true);
    try {
      await api.put(`/resuscitation/${updateTarget.encounter_id}/update`, updateForm, token);
      setUpdateModal(false);
      setUpdateTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassess = async (encounterId: number) => {
    if (!token) return;
    try {
      await api.post(`/resuscitation/${encounterId}/reassess`, {}, token);
      await load();
    } catch {
      // silent
    }
  };

  const handleAddMed = async () => {
    if (!token || !medTarget) return;
    setSubmitting(true);
    try {
      await api.post(`/resuscitation/${medTarget.encounter_id}/medications`, medForm, token);
      setMedModal(false);
      setMedTarget(null);
      setMedForm({ drug: "", dose: "", route: "" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add medication");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOutcome = async (outcome: string) => {
    if (!token || !outcomeTarget) return;
    setSubmitting(true);
    try {
      await api.post(`/resuscitation/${outcomeTarget.encounter_id}/outcome`, { outcome }, token);
      if (outcome === "stabilised" || outcome === "rosc") {
        await api.post(`/encounters/${outcomeTarget.encounter_id}/transition`, { status: "in_consultation" }, token);
      } else if (outcome === "deceased") {
        await api.post(`/encounters/${outcomeTarget.encounter_id}/transition`, { status: "deceased" }, token);
      }
      setOutcomeModal(false);
      setOutcomeTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record outcome");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <HeartPulse className="h-6 w-6 text-red-600" />
        <div>
          <h1 className="text-lg font-semibold">Resuscitation</h1>
          <p className="text-sm text-muted-foreground">
            {patients.length} active resuscitation{patients.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<HeartPulse className="h-6 w-6 text-gray-400" />}
              title="No active resuscitations"
              description="No patients are currently in resuscitation."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {patients.map((p) => {
            const severityBadge = getSeverityBadge(p.severity_level);
            const timerColor = getTimerColor(p.wait_minutes);
            const reassessColor = getReassessColor(p.minutes_since_reassess);
            const isExpanded = expandedId === p.id;

            return (
              <Card key={p.id} className="border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/patients/${p.patient.id}`}
                          className="font-semibold text-foreground hover:text-clinical-primary hover:underline"
                        >
                          {p.patient.full_name}
                        </Link>
                        <span className="text-xs text-muted-foreground font-mono">
                          {p.patient.hospital_number}
                        </span>
                        <StatusBadge
                          label={severityBadge.label}
                          variant={severityBadge.variant}
                          pulse={severityBadge.pulse}
                        />
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {p.chief_complaint || "No chief complaint"}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          <span className={timerColor}>{p.wait_minutes}min</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3" />
                          Last reassess:{" "}
                          <span className={reassessColor}>
                            {p.minutes_since_reassess !== null
                              ? `${p.minutes_since_reassess}min ago`
                              : "Never"}
                          </span>
                        </span>
                        {p.team_lead && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {p.team_lead.name}
                          </span>
                        )}
                        {p.rhythm && (
                          <span className="font-mono">Rhythm: {p.rhythm}</span>
                        )}
                      </div>
                      {p.medications_given.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.medications_given.map((m, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                              <Pill className="h-2.5 w-2.5" />
                              {m.drug} {m.dose}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {!p.team_lead ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setActivateTarget(p);
                            setSelectedLead("");
                            setActivateModal(true);
                          }}
                        >
                          Activate
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setExpandedId(isExpanded ? null : p.id);
                            }}
                          >
                            {isExpanded ? "Collapse" : "Details"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void handleReassess(p.encounter_id)}
                          >
                            Reassess
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && p.team_lead && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Airway</span>
                          <div>{p.airway_intervention || "—"}</div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Breathing</span>
                          <div>{p.breathing_intervention || "—"}</div>
                        </div>
                        <div>
                          <span className="text-xs font-medium text-muted-foreground">Circulation</span>
                          <div>{p.circulation_intervention || "—"}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUpdateTarget(p);
                            setUpdateForm({
                              airway_intervention: p.airway_intervention || "",
                              breathing_intervention: p.breathing_intervention || "",
                              circulation_intervention: p.circulation_intervention || "",
                              rhythm: p.rhythm || "",
                              notes: "",
                            });
                            setUpdateModal(true);
                          }}
                        >
                          Update Interventions
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMedTarget(p);
                            setMedForm({ drug: "", dose: "", route: "" });
                            setMedModal(true);
                          }}
                        >
                          <Pill className="h-3 w-3 mr-1" />
                          Add Medication
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOutcomeTarget(p);
                            setOutcomeModal(true);
                          }}
                        >
                          Record Outcome
                        </Button>
                        <Link href={`/admissions/new?encounter=${p.encounter_id}`}>
                          <Button size="sm" variant="default">
                            Admit to Ward/ICU
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Activate Modal */}
      <Modal open={activateModal} onClose={() => setActivateModal(false)} title="Activate Resuscitation">
        <div className="space-y-4 p-4">
          {activateTarget && (
            <div className="rounded-md bg-red-50 p-3 text-sm">
              <div className="font-medium">{activateTarget.patient.full_name}</div>
              <div className="text-xs text-muted-foreground">
                {activateTarget.patient.hospital_number} — {activateTarget.chief_complaint}
              </div>
            </div>
          )}
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Team Lead</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm"
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
            >
              <option value="">Select clinician...</option>
              {clinicians.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setActivateModal(false)}>Cancel</Button>
            <Button disabled={submitting || !selectedLead} onClick={() => void handleActivate()}>
              {submitting ? "Activating..." : "Activate"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Interventions Modal */}
      <Modal open={updateModal} onClose={() => setUpdateModal(false)} title="Update Interventions">
        <div className="space-y-4 p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Airway Intervention</span>
            <Input
              value={updateForm.airway_intervention}
              onChange={(e) => setUpdateForm((f) => ({ ...f, airway_intervention: e.target.value }))}
              placeholder="e.g. Endotracheal intubation, Oropharyngeal airway"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Breathing Intervention</span>
            <Input
              value={updateForm.breathing_intervention}
              onChange={(e) => setUpdateForm((f) => ({ ...f, breathing_intervention: e.target.value }))}
              placeholder="e.g. BVM ventilation, High-flow O2"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Circulation Intervention</span>
            <Input
              value={updateForm.circulation_intervention}
              onChange={(e) => setUpdateForm((f) => ({ ...f, circulation_intervention: e.target.value }))}
              placeholder="e.g. IV access, Fluid bolus"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Rhythm</span>
            <Input
              value={updateForm.rhythm}
              onChange={(e) => setUpdateForm((f) => ({ ...f, rhythm: e.target.value }))}
              placeholder="e.g. VF, PEA, Asystole, Sinus"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Notes</span>
            <Input
              value={updateForm.notes}
              onChange={(e) => setUpdateForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setUpdateModal(false)}>Cancel</Button>
            <Button disabled={submitting} onClick={() => void handleUpdate()}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Medication Modal */}
      <Modal open={medModal} onClose={() => setMedModal(false)} title="Add Medication">
        <div className="space-y-4 p-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Drug</span>
            <Input
              value={medForm.drug}
              onChange={(e) => setMedForm((f) => ({ ...f, drug: e.target.value }))}
              placeholder="e.g. Adrenaline"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Dose</span>
            <Input
              value={medForm.dose}
              onChange={(e) => setMedForm((f) => ({ ...f, dose: e.target.value }))}
              placeholder="e.g. 1mg IV"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Route</span>
            <Input
              value={medForm.route}
              onChange={(e) => setMedForm((f) => ({ ...f, route: e.target.value }))}
              placeholder="e.g. IV, IM, IO"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setMedModal(false)}>Cancel</Button>
            <Button disabled={submitting || !medForm.drug || !medForm.dose} onClick={() => void handleAddMed()}>
              {submitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Outcome Modal */}
      <Modal open={outcomeModal} onClose={() => setOutcomeModal(false)} title="Record Outcome">
        <div className="space-y-3 p-4">
          <p className="text-sm text-muted-foreground">Select the resuscitation outcome:</p>
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              className="justify-start"
              disabled={submitting}
              onClick={() => void handleOutcome("rosc")}
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-600" />
              ROSC (Return of Spontaneous Circulation)
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              disabled={submitting}
              onClick={() => void handleOutcome("stabilised")}
            >
              <CheckCircle2 className="h-4 w-4 mr-2 text-blue-600" />
              Stabilised — Ready for consultation/admission
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              disabled={submitting}
              onClick={() => void handleOutcome("deceased")}
            >
              <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
              Deceased
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setOutcomeModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
