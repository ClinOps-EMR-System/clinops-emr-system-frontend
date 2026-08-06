"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import BillingConfirmation from "@/components/billing/BillingConfirmation";
import { parseBilling, type BillingSummary } from "@/types/billing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Search, ArrowLeft, Loader2, Check } from "lucide-react";

interface EncounterOption {
  id: number;
  status: string;
  encounter_type: string | null;
  created_at: string;
}

interface LoincResult {
  code: string;
  display_name: string;
  component_name: string | null;
  system: string | null;
}

const priorityOptions: ("Routine" | "Urgent" | "Stat")[] = ["Routine", "Urgent", "Stat"];

export default function NewLabRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const patientIdFromUrl = searchParams.get("patient_id");
  const encounterIdFromUrl = searchParams.get("encounter_id");

  const [patientId, setPatientId] = useState(patientIdFromUrl || "");
  const [encounterId, setEncounterId] = useState(encounterIdFromUrl || "");
  const [encounters, setEncounters] = useState<EncounterOption[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(!!patientIdFromUrl);

  const [loincQuery, setLoincQuery] = useState("");
  const [loincResults, setLoincResults] = useState<LoincResult[]>([]);
  const [selectedLoinc, setSelectedLoinc] = useState<LoincResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [specimenType, setSpecimenType] = useState("");
  const [priority, setPriority] = useState<"Routine" | "Urgent" | "Stat">("Routine");
  const [clinicalIndication, setClinicalIndication] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);

  const loadEncounters = useCallback(async (pid: string) => {
    if (!pid.trim()) {
      setEncounters([]);
      return;
    }
    setLoadingEncounters(true);
    setError(null);
    try {
      const res = await api.get(`/patients/${encodeURIComponent(pid.trim())}/encounters`, token);
      const payload = res?.data ?? res;
      setEncounters(Array.isArray(payload) ? payload : payload?.data ?? []);
    } catch {
      setEncounters([]);
      setError("Failed to load encounters for this patient.");
    } finally {
      setLoadingEncounters(false);
    }
  }, [token]);

  useEffect(() => {
    if (patientIdFromUrl) loadEncounters(patientIdFromUrl); // eslint-disable-line react-hooks/set-state-in-effect
  }, [patientIdFromUrl, loadEncounters]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (loincQuery.trim().length >= 2) {
        try {
          setSearchLoading(true);
          const response = await api.get(`/loinc/search?q=${encodeURIComponent(loincQuery)}`, token);
          setLoincResults(Array.isArray(response) ? response : response?.data ?? []);
        } catch {
          setLoincResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setLoincResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [loincQuery, token]);

  const handleLoadEncounters = (e: React.FormEvent) => {
    e.preventDefault();
    setEncounterId("");
    loadEncounters(patientId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoinc || !encounterId.trim()) {
      setError("Select an encounter and a test before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post(
        "/lab-requests",
        {
          encounter_id: parseInt(encounterId),
          loinc_code: selectedLoinc.code,
          specimen_type: specimenType.trim() || null,
          priority,
          clinical_indication: clinicalIndication.trim() || null,
        },
        token
      );
      const billing = parseBilling(res);
      if (billing) {
        setBillingSummary(billing);
        return;
      }
      setSuccessMsg("Lab request created successfully.");
      setTimeout(() => router.push("/lab"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create lab request.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" nativeButton={false} onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">Laboratory</span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Lab Request</h1>
          <p className="text-sm text-muted-foreground">Order a diagnostic test and attach the charge to the patient&apos;s bill</p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Patient & Encounter */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patient & Encounter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Charges are attached to the bill of the encounter&apos;s patient.</p>

            {patientIdFromUrl ? (
              <div className="px-3 py-2 border border-input rounded-lg bg-muted text-sm text-foreground font-medium">
                Patient #{patientIdFromUrl}
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Patient ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter patient ID"
                    className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  nativeButton={false}
                  onClick={handleLoadEncounters}
                  disabled={loadingEncounters}
                >
                  {loadingEncounters ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load Encounters"}
                </Button>
              </div>
            )}

            {loadingEncounters ? (
              <p className="text-sm text-muted-foreground mt-3">Loading encounters...</p>
            ) : encounters.length > 0 ? (
              <div className="mt-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Encounter <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                >
                  <option value="">Select encounter</option>
                  {encounters.map((enc) => (
                    <option key={enc.id} value={enc.id}>
                      #{enc.id} · {enc.encounter_type || "Visit"} · {enc.status} · {new Date(enc.created_at).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-3">
                {patientIdFromUrl || patientId ? "No encounters found for this patient." : "Enter a patient ID to load their encounters."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Test Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Test Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-4">Search the LOINC catalog to select a test.</p>

            <div className="relative">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Test <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={loincQuery}
                  onChange={(e) => { setLoincQuery(e.target.value); setSelectedLoinc(null); }}
                  placeholder="Search by test name or LOINC code..."
                  className="block w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                />
              </div>
              {searchLoading && (
                <div className="absolute left-0 right-0 mt-1 p-3 bg-card border border-input rounded-lg shadow-lg text-xs text-muted-foreground z-30">
                  Searching...
                </div>
              )}
              {!searchLoading && loincResults.length > 0 && (
                <ul className="absolute left-0 right-0 mt-1 bg-card border border-input rounded-lg shadow-lg max-h-60 overflow-y-auto z-30 divide-y text-sm">
                  {loincResults.map((result) => (
                    <li key={result.code}>
                      <button
                        type="button"
                        onClick={() => { setSelectedLoinc(result); setLoincQuery(result.display_name); setLoincResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-muted flex items-baseline justify-between transition-colors"
                      >
                        <span className="font-medium text-foreground">{result.display_name}</span>
                        <span className="font-mono text-xs text-muted-foreground ml-3 shrink-0">{result.code}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedLoinc && (
              <div className="mt-3 rounded-lg bg-green-50 border border-green-200 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-green-900 truncate">{selectedLoinc.display_name}</p>
                    <p className="text-xs text-green-700 font-mono">{selectedLoinc.code}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  nativeButton={false}
                  onClick={() => { setSelectedLoinc(null); setLoincQuery(""); }}
                >
                  Clear
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Specimen Type
                </label>
                <input
                  type="text"
                  value={specimenType}
                  onChange={(e) => setSpecimenType(e.target.value)}
                  placeholder="e.g., Whole blood, Serum"
                  className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as "Routine" | "Urgent" | "Stat")}
                  className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                >
                  {priorityOptions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Clinical Indication
              </label>
              <textarea
                rows={2}
                value={clinicalIndication}
                onChange={(e) => setClinicalIndication(e.target.value)}
                placeholder="Reason for the test..."
                className="mt-1 block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            nativeButton={false}
            disabled={submitting || !selectedLoinc || !encounterId.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" /> Create Lab Request
              </>
            )}
          </Button>
        </div>
      </form>

      {billingSummary && (
        <BillingConfirmation
          billing={billingSummary}
          onDone={() => {
            setBillingSummary(null);
            router.push("/lab");
          }}
        />
      )}
    </div>
  );
}