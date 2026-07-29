"use client";

import { cn } from "@/lib/utils";
import {
  MessageSquareText, HeartPulse, Syringe, Baby, AlertTriangle, Activity, Check,
} from "lucide-react";

export interface SidebarTab {
  key: string;
  label: string;
  icon: React.ReactNode;
  mandatory?: boolean;
  done?: boolean;
}

const tabs: SidebarTab[] = [
  { key: "complaint", label: "Chief Complaint", icon: <MessageSquareText className="h-4 w-4" />, mandatory: true },
  { key: "vitals", label: "Record Vitals & NEWS2", icon: <HeartPulse className="h-4 w-4" />, mandatory: true },
  { key: "allergies", label: "Allergy Check", icon: <Syringe className="h-4 w-4" />, mandatory: true },
  { key: "pregnancy", label: "Pregnancy Assessment", icon: <Baby className="h-4 w-4" /> },
  { key: "infection", label: "Infection Screening", icon: <AlertTriangle className="h-4 w-4" /> },
  { key: "trends", label: "Physiological Trends", icon: <Activity className="h-4 w-4" /> },
];

interface TriageSidebarProps {
  activeTab: string;
  onTabChange: (key: string) => void;
  hasComplaint: boolean;
  hasVitals: boolean;
  hasAllergies: boolean;
  showPregnancy: boolean;
}

export default function TriageSidebar({
  activeTab, onTabChange,
  hasComplaint, hasVitals, hasAllergies, showPregnancy,
}: TriageSidebarProps) {
  const doneMap: Record<string, boolean> = { complaint: hasComplaint, vitals: hasVitals, allergies: hasAllergies };

  return (
    <div className="lg:col-span-1">
      {/* Mobile: horizontal scroll */}
      <div className="lg:hidden sticky top-0 z-20 bg-white border rounded-lg -mx-4 mb-4 px-2 py-2 shadow-sm">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.filter(t => t.key !== "pregnancy" || showPregnancy).map((tab) => (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex-shrink-0 px-3 py-2 text-xs font-bold rounded transition-all min-h-[40px] whitespace-nowrap flex items-center gap-1.5",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-600 hover:bg-gray-50 bg-gray-50"
              )}
            >
              {doneMap[tab.key] && <Check className="h-3 w-3" />}
              {tab.label}
              {tab.mandatory && <span className="text-[8px] font-mono text-amber-500">*</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden lg:flex lg:flex-col gap-1 bg-card rounded-xl border p-3">
        {tabs.filter(t => t.key !== "pregnancy" || showPregnancy).map((tab) => {
          const isActive = activeTab === tab.key;
          const done = doneMap[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-lg font-bold transition-all text-left",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <span className={cn("shrink-0", isActive ? "text-white" : "text-muted-foreground")}>
                {done ? <Check className="h-4 w-4 text-emerald-400" /> : tab.icon}
              </span>
              {tab.label}
              {tab.mandatory && (
                <span className={cn(
                  "ml-auto text-[9px] font-mono font-normal uppercase",
                  done ? "text-emerald-400" : isActive ? "text-white/70" : "text-muted-foreground"
                )}>
                  {done ? "done" : "req"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
