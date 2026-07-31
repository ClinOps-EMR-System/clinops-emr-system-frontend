"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, X, LogOut, DoorOpen, Stethoscope, HeartPulse, Skull } from "lucide-react";
import { cn } from "@/lib/utils";

interface Ward {
  id: number;
  name: string;
  code: string;
  ward_type: string;
  total_beds: number;
}

interface Bed {
  id: number;
  bed_number: string;
  occupancy_status: string;
}

type DispositionTab = "discharge" | "admit" | "refer" | "observe" | "deceased";

const tabs: { key: DispositionTab; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "discharge", label: "Discharge", icon: <LogOut className="h-4 w-4" />, color: "emerald" },
  { key: "admit", label: "Admit", icon: <DoorOpen className="h-4 w-4" />, color: "purple" },
  { key: "refer", label: "Refer", icon: <Stethoscope className="h-4 w-4" />, color: "sky" },
  { key: "observe", label: "Observe", icon: <HeartPulse className="h-4 w-4" />, color: "amber" },
  { key: "deceased", label: "Deceased", icon: <Skull className="h-4 w-4" />, color: "red" },
];

interface DispositionModalProps {
  open: boolean;
  onClose: () => void;
  encounterId: number;
  patientId: string;
  patientName: string;
  onDisposed: () => void;
  activeTab: DispositionTab;
  onTabChange: (tab: DispositionTab) => void;
}

export default function DispositionModal({ open, onClose, encounterId, patientId, patientName, onDisposed, activeTab, onTabChange }: DispositionModalProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dischargeDiagnosis, setDischargeDiagnosis] = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");

  const [wards, setWards] = useState<Ward[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedWardId, setSelectedWardId] = useState<number | "">("");
  const [selectedBedId, setSelectedBedId] = useState<number | "">("");
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState("");
  const [acuityLevel, setAcuityLevel] = useState("Medium");

  const [destinationFacility, setDestinationFacility] = useState("");
  const [destinationDepartment, setDestinationDepartment] = useState("");
  const [clinicalSummary, setClinicalSummary] = useState("");
  const [urgency, setUrgency] = useState("Routine");
  const [referralType, setReferralType] = useState("Consultation");

  const [observeNotes, setObserveNotes] = useState("");

  const [deceasedConfirmed, setDeceasedConfirmed] = useState(false);

  useEffect(() => {
    if (open && token) {
      api.get("/wards", token).then((res) => {
        setWards(Array.isArray(res?.data) ? res.data : res?.data?.data || []);
      }).catch(() => setWards([]));
    }
  }, [open, token]);

  useEffect(() => {
    if (selectedWardId && token) {
      api.get(`/wards/${selectedWardId}/beds`, token).then((res) => {
        const bedsData = Array.isArray(res?.data) ? res.data : res?.data?.data || [];
        setBeds(bedsData.filter((b: Bed) => b.occupancy_status === "Available"));
      }).catch(() => setBeds([]));
    }
  }, [selectedWardId, token]);

  const resetForm = () => {
    setDischargeDiagnosis("");
    setDischargeSummary("");
    setSelectedWardId("");
    setSelectedBedId("");
    setAdmissionDiagnosis("");
    setAcuityLevel("Medium");
    setDestinationFacility("");
    setDestinationDepartment("");
    setClinicalSummary("");
    setUrgency("Routine");
    setReferralType("Consultation");
    setObserveNotes("");
    setDeceasedConfirmed(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleDispose = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { disposition: activeTab };

      switch (activeTab) {
        case "discharge":
          payload.discharge_diagnosis = dischargeDiagnosis;
          payload.discharge_summary = dischargeSummary;
          break;
        case "admit":
          payload.ward_id = selectedWardId;
          payload.bed_id = selectedBedId;
          payload.admission_diagnosis = admissionDiagnosis;
          payload.acuity_level = acuityLevel;
          break;
        case "refer":
          payload.destination_facility = destinationFacility || undefined;
          payload.destination_department = destinationDepartment || undefined;
          payload.clinical_summary = clinicalSummary;
          payload.urgency = urgency;
          payload.referral_type = referralType;
          break;
        case "observe":
          payload.notes = observeNotes;
          break;
        case "deceased":
          break;
      }

      await api.post(`/encounters/${encounterId}/dispose`, payload, token);
      onDisposed();
      handleClose();
      router.push(`/patients/${patientId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to complete disposition.");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = () => {
    if (loading) return true;
    switch (activeTab) {
      case "discharge":
        return !dischargeDiagnosis.trim() || !dischargeSummary.trim();
      case "admit":
        return !selectedWardId || !selectedBedId || !admissionDiagnosis.trim();
      case "refer":
        return (!destinationFacility.trim() && !destinationDepartment.trim()) || !clinicalSummary.trim();
      case "observe":
        return false;
      case "deceased":
        return !deceasedConfirmed;
      default:
        return true;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-bold">Patient Disposition</h2>
            <p className="text-sm text-muted-foreground">{patientName}</p>
          </div>
          <button onClick={handleClose} className="p-1 rounded-md hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { onTabChange(tab.key); setError(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2",
                activeTab === tab.key
                  ? "border-foreground text-foreground bg-muted/30"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold">
              {error}
            </div>
          )}

          {activeTab === "discharge" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Patient will be discharged home with instructions.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                  Discharge Diagnosis <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={dischargeDiagnosis}
                  onChange={(e) => setDischargeDiagnosis(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Final diagnosis"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                  Discharge Summary <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={4}
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Treatment given, instructions, follow-up..."
                />
              </div>
            </div>
          )}

          {activeTab === "admit" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Transfer patient to an inpatient ward bed.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                    Ward <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={selectedWardId}
                    onChange={(e) => { setSelectedWardId(Number(e.target.value)); setSelectedBedId(""); }}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select ward...</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                    Bed <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(Number(e.target.value))}
                    disabled={!selectedWardId}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">Select bed...</option>
                    {beds.map((b) => (
                      <option key={b.id} value={b.id}>Bed {b.bed_number}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                  Admission Diagnosis <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={admissionDiagnosis}
                  onChange={(e) => setAdmissionDiagnosis(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Reason for admission"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Acuity Level</label>
                <select
                  value={acuityLevel}
                  onChange={(e) => setAcuityLevel(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === "refer" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Refer patient to another facility or specialist department.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Destination Facility</label>
                  <input
                    type="text"
                    value={destinationFacility}
                    onChange={(e) => setDestinationFacility(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Hospital name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Destination Department</label>
                  <input
                    type="text"
                    value={destinationDepartment}
                    onChange={(e) => setDestinationDepartment(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="e.g. Surgery, Ophthalmology"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Referral Type</label>
                  <select
                    value={referralType}
                    onChange={(e) => setReferralType(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Transfer of Care">Transfer of Care</option>
                    <option value="Emergency Transfer">Emergency Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Urgency</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                  Clinical Summary <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={4}
                  value={clinicalSummary}
                  onChange={(e) => setClinicalSummary(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Brief clinical summary for receiving team..."
                />
              </div>
            </div>
          )}

          {activeTab === "observe" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Keep patient for short-stay observation with serial vitals monitoring.</p>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">Observation Notes</label>
                <textarea
                  rows={4}
                  value={observeNotes}
                  onChange={(e) => setObserveNotes(e.target.value)}
                  className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Monitoring plan, expected duration..."
                />
              </div>
            </div>
          )}

          {activeTab === "deceased" && (
            <div className="space-y-4">
              <Card className="border-red-200 bg-red-50/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Skull className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-bold text-red-900">Record Patient Death</h4>
                      <p className="text-sm text-red-700 mt-1">
                        This action will mark the patient as deceased and close the encounter.
                        This cannot be undone.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deceasedConfirmed}
                  onChange={(e) => setDeceasedConfirmed(e.target.checked)}
                  className="h-4 w-4 rounded border-red-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-semibold text-foreground">
                  I confirm the patient has been pronounced dead
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleDispose}
            disabled={isSubmitDisabled()}
            variant={activeTab === "deceased" ? "destructive" : "default"}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {activeTab === "deceased" ? "Record Death" : `Confirm ${tabs.find((t) => t.key === activeTab)?.label}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
