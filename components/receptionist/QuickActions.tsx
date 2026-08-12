"use client";

import Link from "next/link";
import { UserPlus, CalendarPlus, Search, Ambulance } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  {
    label: "Register Patient",
    href: "/patients/register",
    icon: UserPlus,
    color: "text-brand-green",
  },
  {
    label: "New Appointment",
    href: "/appointments?new=true",
    icon: CalendarPlus,
    color: "text-sky-600",
  },
  {
    label: "Search Patient",
    href: "/patients",
    icon: Search,
    color: "text-purple-600",
  },
  {
    label: "Emergency Reg.",
    href: "/patients/register?emergency=true",
    icon: Ambulance,
    color: "text-red-600",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              nativeButton={false}
              className="h-auto flex-col gap-1.5 p-4"
              render={<Link href={action.href} />}
            >
              <action.icon className={`size-5 ${action.color}`} />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
