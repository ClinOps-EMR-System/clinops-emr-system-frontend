"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Stat {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  href?: string;
  pulse?: boolean;
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat) => {
        const inner = (
          <Card className="h-full transition-all hover:shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.pulse && (
                  <span className="size-1.5 shrink-0 rounded-full bg-red-500 animate-pulse" />
                )}
                {stat.label}
              </CardTitle>
              <stat.icon className={cn("size-4 shrink-0", stat.color ?? "text-muted-foreground/60")} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        );
        return stat.href ? (
          <Link key={stat.label} href={stat.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={stat.label}>{inner}</div>
        );
      })}
    </div>
  );
}
