"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Activity, LogOut, Percent, ShieldAlert, Users, CheckCircle, Ambulance, ClipboardList } from "lucide-react";
import type { AdmissionStats as AdmissionStatsType } from "../../types/admission";

interface AdmissionStatsProps {
  stats: AdmissionStatsType;
}

export function AdmissionStats({ stats }: AdmissionStatsProps) {
  const items = [
    { label: "Active Admissions", value: stats.active_admissions, icon: Activity },
    { label: "Today Admissions", value: stats.today_admissions, icon: Users },
    { label: "Today Discharges", value: stats.today_discharges, icon: LogOut },
    { label: "Bed Occupancy", value: `${stats.bed_occupancy.rate}%`, icon: Percent },
    { label: "Isolation", value: stats.isolation_patients, icon: ShieldAlert },
    { label: "Available Beds", value: stats.bed_occupancy.available, icon: CheckCircle },
    { label: "Emergency", value: stats.by_admission_type.Emergency ?? 0, icon: Ambulance },
    { label: "Elective", value: stats.by_admission_type.Elective ?? 0, icon: ClipboardList },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="transition-all hover:shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-4">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </CardTitle>
            <item.icon className="size-4 text-muted-foreground/60" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              {item.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
