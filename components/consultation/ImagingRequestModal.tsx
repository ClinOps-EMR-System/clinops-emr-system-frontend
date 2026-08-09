"use client";

import { useState } from "react";
import { ScanLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const MODALITY_PRESETS: { label: string; imaging_type: string; body_site: string | null }[] = [
  { label: "X-Ray Chest PA", imaging_type: "X-Ray", body_site: "Chest" },
  { label: "X-Ray Extremity", imaging_type: "X-Ray", body_site: "Extremity" },
  { label: "Ultrasound Abdomen", imaging_type: "Ultrasound", body_site: "Abdomen" },
  { label: "Ultrasound Pelvis", imaging_type: "Ultrasound", body_site: "Pelvis" },
  { label: "CT Scan", imaging_type: "CT", body_site: null },
  { label: "MRI", imaging_type: "MRI", body_site: null },
];

const PRIORITY_OPTIONS = ["Routine", "Urgent", "Stat"] as const;

interface ImagingRequestFormProps {
  encounterId: number | null;
  token: string | null;
  onCreated?: () => void;
  onClose: () => void;
}

function ImagingRequestForm({ encounterId, token, onCreated, onClose }: ImagingRequestFormProps) {
  const [imagingType, setImagingType] = useState("");
  const [bodySite, setBodySite] = useState("");
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("Routine");
  const [custom, setCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setImagingType("");
      setBodySite("");
      setClinicalIndication("");
      setPriority("Routine");
      setCustom(false);
      setError(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encounterId) {
      setError("No active encounter for this patient.");
      return;
    }
    if (!imagingType.trim()) {
      setError("Select a modality or enter an imaging type.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(
        "/imaging-requests",
        {
          encounter_id: encounterId,
          imaging_type: imagingType.trim(),
          body_site: bodySite.trim() || null,
          clinical_indication: clinicalIndication.trim() || null,
          priority,
        },
        token
      );
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place imaging request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">{error}</div>
      )}

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Modality
        </label>
        <div className="grid grid-cols-2 gap-2">
          {MODALITY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setCustom(false);
                setImagingType(preset.imaging_type);
                setBodySite(preset.body_site ?? "");
                setError(null);
              }}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors text-left",
                !custom && imagingType === preset.imaging_type && bodySite === (preset.body_site ?? "")
                  ? "border-clinical-primary bg-clinical-primary/10 text-clinical-primary"
                  : "border-input hover:bg-muted"
              )}
            >
              <ScanLine className="h-4 w-4 shrink-0" />
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setCustom(true);
              setImagingType("");
              setBodySite("");
            }}
            className={cn(
              "flex items-center justify-center rounded-lg border border-dashed px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors",
              custom && "border-clinical-primary bg-clinical-primary/10 text-clinical-primary"
            )}
          >
            Custom
          </button>
        </div>
      </div>

      {custom && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="field-imaging-type" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Imaging Type <span className="text-red-500">*</span>
            </label>
            <input
              id="field-imaging-type"
              type="text"
              required
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              placeholder="e.g. X-Ray, Ultrasound, CT, MRI"
              value={imagingType}
              onChange={(e) => setImagingType(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="field-body-site" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Body Site
            </label>
            <input
              id="field-body-site"
              type="text"
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              placeholder="e.g. Chest, Abdomen, Head"
              value={bodySite}
              onChange={(e) => setBodySite(e.target.value)}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="field-clinical-indication" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Clinical Indication <span className="text-muted-foreground font-normal normal-case">(optional)</span>
        </label>
        <textarea
          id="field-clinical-indication"
          rows={2}
          className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
          placeholder="Reason for the scan, e.g. suspected pneumonia"
          value={clinicalIndication}
          onChange={(e) => setClinicalIndication(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
          Priority
        </label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPriority(option)}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                priority === option
                  ? option === "Stat"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : option === "Urgent"
                    ? "border-amber-500 bg-amber-50 text-amber-700"
                    : "border-clinical-primary bg-clinical-primary/10 text-clinical-primary"
                  : "border-input hover:bg-muted"
              )}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !imagingType.trim()}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Place Imaging Request
        </Button>
      </div>
    </form>
  );
}

interface ImagingRequestModalProps {
  open: boolean;
  onClose: () => void;
  encounterId: number | null;
  token: string | null;
  onCreated?: () => void;
}

export default function ImagingRequestModal({ open, onClose, encounterId, token, onCreated }: ImagingRequestModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Request Radiography / Imaging"
      subtitle="Order a scan for the radiographer worklist"
      size="lg"
    >
      <ImagingRequestForm
        encounterId={encounterId}
        token={token}
        onCreated={onCreated}
        onClose={onClose}
      />
    </Modal>
  );
}
