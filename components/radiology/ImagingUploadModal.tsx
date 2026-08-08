"use client";

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ImagingUploadTarget {
  imaging_request_id: number;
  imaging_type: string;
  body_site: string | null;
  patient: { full_name: string };
}

interface ImagingUploadModalProps {
  open: boolean;
  onClose: () => void;
  request: ImagingUploadTarget | null;
  token: string | null;
  onComplete?: () => void;
}

export default function ImagingUploadModal({ open, onClose, request, token, onComplete }: ImagingUploadModalProps) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [technique, setTechnique] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setImages([]);
      setPreviews([]);
      setTechnique("");
      setFindings("");
      setImpression("");
      setConclusion("");
      setIsCritical(false);
      setError(null);
      setSuccess(null);
    }
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 10 - images.length);
    setImages((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;
    if (!findings.trim() || !impression.trim()) {
      setError("Findings and Impression are required to submit the report.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      images.forEach((file) => formData.append("images[]", file));
      formData.append("findings", findings);
      formData.append("impression", impression);
      if (technique.trim()) formData.append("technique", technique.trim());
      if (conclusion.trim()) formData.append("conclusion", conclusion.trim());
      formData.append("is_critical", String(isCritical));
      await api.post(`/imaging-requests/${request.imaging_request_id}/complete`, formData, token);
      setSuccess("Report submitted and released to the clinical team.");
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload results");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Results & Images"
      subtitle={request ? `${request.imaging_type}${request.body_site ? ` — ${request.body_site}` : ""} · ${request.patient.full_name}` : ""}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {success ? "Close" : "Cancel"}
          </Button>
          {!success && (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting..." : "Upload Results & Release"}
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 font-medium">{success}</div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">{error}</div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Scan Images <span className="text-muted-foreground font-normal normal-case">(optional, up to 10)</span>
          </label>
          <label
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input px-4 py-8 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors",
              images.length > 0 && "hidden"
            )}
          >
            <ImagePlus className="h-6 w-6" />
            <span>Click to select scan image files (jpeg, png, gif, webp)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {previews.map((src, i) => (
                <div key={`${src}-${i}`} className="relative aspect-square rounded-lg border border-border overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Scan ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
                <ImagePlus className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Technique <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            placeholder="e.g. PA chest radiograph, supine"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Findings <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Describe the radiological findings..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Impression <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="Radiologist's diagnostic impression..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Conclusion / Recommendation <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <textarea
            rows={2}
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Follow-up recommendation..."
          />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isCritical}
            onChange={(e) => setIsCritical(e.target.checked)}
            className="rounded border-input text-red-600 focus:ring-red-500"
          />
          <span className="font-medium text-foreground">Mark as Critical Finding</span>
        </label>
      </form>
    </Modal>
  );
}
