"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Send, CheckCircle2, Loader2 } from "lucide-react";

interface TriageProgressCardProps {
  hasComplaint: boolean;
  hasVitals: boolean;
  hasAllergies: boolean;
  completing: boolean;
  onComplete: () => void;
}

export default function TriageProgressCard({
  hasComplaint, hasVitals, hasAllergies, completing, onComplete,
}: TriageProgressCardProps) {
  const mandatoryDone = hasComplaint && hasVitals && hasAllergies;
  const totalMandatory = 3;
  const completedMandatory = [hasComplaint, hasVitals, hasAllergies].filter(Boolean).length;
  const progressPct = Math.round((completedMandatory / totalMandatory) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Triage Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {completedMandatory} of {totalMandatory} mandatory steps
            </span>
            <span className={cn(
              "text-xs font-bold font-mono",
              mandatoryDone ? "text-emerald-600" : "text-amber-600"
            )}>
              {mandatoryDone ? "100%" : `${progressPct}%`}
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                mandatoryDone ? "bg-emerald-500" : "bg-primary"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex gap-4 mt-1.5 text-[10px] font-mono text-muted-foreground">
            <span className={cn(hasComplaint && "text-emerald-600 font-semibold")}>
              {hasComplaint ? "✓" : "○"} Complaint
            </span>
            <span className={cn(hasVitals && "text-emerald-600 font-semibold")}>
              {hasVitals ? "✓" : "○"} Vitals
            </span>
            <span className={cn(hasAllergies && "text-emerald-600 font-semibold")}>
              {hasAllergies ? "✓" : "○"} Allergies
            </span>
          </div>
        </div>

        <Button
          onClick={onComplete}
          disabled={!mandatoryDone || completing}
          className="w-full"
          size="lg"
        >
          {completing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Completing Triage...</>
          ) : mandatoryDone ? (
            <><Send className="h-4 w-4" /> Complete Triage & Send to Consultation</>
          ) : (
            <><CheckCircle2 className="h-4 w-4" /> Complete Chief Complaint, Vital Signs, and Allergies first</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
