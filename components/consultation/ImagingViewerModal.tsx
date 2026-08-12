"use client";

import { useState } from "react";
import { ImageOff, Loader2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { getPublicAssetUrl } from "@/lib/config";
import type { ImagingResult } from "@/types/imaging";

interface ImagingViewerModalProps {
  result: ImagingResult | null;
  imagingType?: string | null;
  bodySite?: string | null;
  onClose: () => void;
}

function ResultImage({ url, alt }: { url: string | null; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <p className="text-sm">No image attached to this report.</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black">
      {!loaded && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={`w-full max-h-[50vh] object-contain ${loaded ? "block" : "hidden"}`}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export default function ImagingViewerModal({ result, imagingType, bodySite, onClose }: ImagingViewerModalProps) {
  const galleryImages =
    result?.images && result.images.length > 0
      ? result.images
      : result?.image_url
        ? [{ id: -1, image_url: result.image_url, sort_order: 0 }]
        : [];

  return (
    <Modal
      open={result !== null}
      onClose={onClose}
      title="Imaging Viewer"
      subtitle={
        result
          ? `${imagingType ?? "Imaging"}${bodySite ? ` — ${bodySite}` : ""} · Report ${result.status}`
          : ""
      }
      size="xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {result && (
        <div className="space-y-5">
          {result.is_critical && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm font-medium text-red-800">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Critical finding — flagged for immediate clinical review.
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Scan Image{result && galleryImages.length > 1 ? `s (${galleryImages.length})` : ""}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {galleryImages.map((img) => (
                <ResultImage
                  key={img.id}
                  url={getPublicAssetUrl(img.image_url)}
                  alt={`${imagingType ?? "Imaging"} scan${galleryImages.length > 1 ? ` — view ${img.sort_order + 1}` : ""}`}
                />
              ))}
            </div>
          </div>

          {result.technique && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Technique
              </label>
              <p className="text-sm text-foreground">{result.technique}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Findings
              </label>
              <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg bg-muted/40 border border-border p-3">
                {result.findings}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Impression
              </label>
              <p className="text-sm text-foreground font-medium whitespace-pre-wrap rounded-lg bg-muted/40 border border-border p-3">
                {result.impression}
              </p>
            </div>
          </div>

          {result.conclusion && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Conclusion / Recommendation
              </label>
              <p className="text-sm text-foreground whitespace-pre-wrap">{result.conclusion}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <Badge variant={result.status === "Released" ? "default" : "outline"}>{result.status}</Badge>
            {result.is_critical && <Badge variant="destructive">Critical</Badge>}
            {result.reported_by?.name && <span>Reported by {result.reported_by.name}</span>}
            {result.released_by?.name && <span>· Released by {result.released_by.name}</span>}
          </div>
        </div>
      )}
    </Modal>
  );
}
