"use client";

import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { LabResult } from "@/types/lab";

function valueOf(result: LabResult) {
  if (result.result_value_numeric != null) return String(result.result_value_numeric);
  return result.result_value_text ?? "-";
}

export default function LabResultModal({ result, onClose }: { result: LabResult; onClose: () => void }) {
  const testName = result.lab_request?.test_name ?? "Lab result";
  const value = valueOf(result);

  return (
    <Modal
      open
      onClose={onClose}
      title={testName}
      subtitle="Laboratory Result"
      size="md"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className={cn("font-mono text-2xl font-bold", result.is_critical && "text-red-600", result.is_abnormal && !result.is_critical && "text-amber-600")}>
            {value}{result.unit ? ` ${result.unit}` : ""}
          </span>
          {result.is_critical && <Badge variant="destructive">Critical</Badge>}
          {result.is_abnormal && !result.is_critical && <Badge variant="secondary" className="text-amber-700">Abnormal</Badge>}
        </div>

        {result.reference_range && (
          <div className="text-sm">
            <span className="text-muted-foreground">Reference range: </span>
            <span className="font-mono font-semibold">{result.reference_range}</span>
          </div>
        )}

        <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className="font-semibold capitalize">{result.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Released</span>
            <span className="font-mono text-xs">{result.released_at ? format(new Date(result.released_at), "dd MMM yyyy HH:mm") : "—"}</span>
          </div>
          {result.released_by?.name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Released by</span>
              <span className="font-semibold">{result.released_by.name}</span>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
