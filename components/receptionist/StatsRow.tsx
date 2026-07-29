"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface Stat {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: string;
  href?: string;
}

export function StatsRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => {
        const inner = (
          <div className="bg-white rounded border border-[#becab7]/50 p-4 hover:border-[#3e4a3b]/30 hover:shadow-sm transition-all h-full">
            <div className="flex items-center gap-3">
              <div className={`h-9 w-9 rounded flex items-center justify-center ${stat.color || "bg-gray-100"}`}>
                <stat.icon className={`h-4 w-4 ${stat.color ? "text-white" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{stat.value}</p>
                <p className="text-[10px] font-bold text-[#5f5e5e] uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          </div>
        );
        return stat.href ? <Link key={stat.label} href={stat.href}>{inner}</Link> : <div key={stat.label}>{inner}</div>;
      })}
    </div>
  );
}
