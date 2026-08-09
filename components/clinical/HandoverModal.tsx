"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, ArrowRightLeft } from "lucide-react";

interface User {
  id: number;
  name: string;
  email: string;
}

interface HandoverModalProps {
  open: boolean;
  onClose: () => void;
  patientId: number;
  encounterId: number;
  patientName: string;
}

export default function HandoverModal({ open, onClose, patientId, encounterId, patientName }: HandoverModalProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [toUserId, setToUserId] = useState<number | "">("");
  const [situation, setSituation] = useState("");
  const [background, setBackground] = useState("");
  const [assessment, setAssessment] = useState("");
  const [recommendation, setRecommendation] = useState("");

  useEffect(() => {
    if (open && token) {
      api.get("/users", token).then((res) => {
        const data = res?.data?.data ?? res?.data ?? [];
        setUsers(Array.isArray(data) ? data : []);
      }).catch(() => setUsers([]));
    }
  }, [open, token]);

  const resetForm = () => {
    setToUserId("");
    setSituation("");
    setBackground("");
    setAssessment("");
    setRecommendation("");
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleClose]);

  const handleSubmit = async () => {
    if (!toUserId || !situation.trim() || !background.trim() || !assessment.trim() || !recommendation.trim()) {
      setError("All SBAR fields and recipient are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/handovers", {
        patient_id: patientId,
        encounter_id: encounterId,
        to_user_id: toUserId,
        sbar_situation: situation,
        sbar_background: background,
        sbar_assessment: assessment,
        sbar_recommendation: recommendation,
      }, token);
      setSuccess(true);
      setTimeout(handleClose, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create handover.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Clinical Handover">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} aria-hidden="true" />
      <div className="relative bg-card rounded-xl shadow-2xl border w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold">Clinical Handover (SBAR)</h2>
              <p className="text-sm text-muted-foreground">{patientName}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-md hover:bg-muted transition-colors" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold">{error}</div>
          )}
          {success && (
            <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-semibold">Handover sent successfully.</div>
          )}

          <div>
            <label htmlFor="field-handover-to" className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
              Hand Over To <span className="text-destructive">*</span>
            </label>
            <select
              id="field-handover-to"
              value={toUserId}
              onChange={(e) => setToUserId(Number(e.target.value))}
              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select clinician...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-700">Situation</CardTitle>
            </CardHeader>
            <CardContent>
              <label htmlFor="handover-situation" className="sr-only">Situation</label>
              <textarea
                id="handover-situation"
                rows={2}
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="What is happening right now? What is the clinical situation?"
              />
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-700">Background</CardTitle>
            </CardHeader>
            <CardContent>
              <label htmlFor="handover-background" className="sr-only">Background</label>
              <textarea
                id="handover-background"
                rows={2}
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="What is the clinical background? Relevant history, medications..."
              />
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <label htmlFor="handover-assessment" className="sr-only">Assessment</label>
              <textarea
                id="handover-assessment"
                rows={2}
                value={assessment}
                onChange={(e) => setAssessment(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="What do you think the problem is? Clinical impression..."
              />
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700">Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
              <label htmlFor="handover-recommendation" className="sr-only">Recommendation</label>
              <textarea
                id="handover-recommendation"
                rows={2}
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="What do you recommend? Actions needed, monitoring plan..."
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !toUserId || !situation.trim() || !background.trim() || !assessment.trim() || !recommendation.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send Handover
          </Button>
        </div>
      </div>
    </div>
  );
}
