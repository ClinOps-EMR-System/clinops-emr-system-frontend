"use client";

import React from "react";
import clsx from "clsx";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "purple";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  error: "bg-red-100 text-red-800 border-red-200",
  info: "bg-sky-100 text-sky-800 border-sky-200",
  neutral: "bg-gray-100 text-gray-700 border-gray-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
};

export default function StatusBadge({ label, variant = "neutral", size = "sm", pulse = false, className }: StatusBadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-bold uppercase tracking-wider border rounded-full font-mono",
        variantStyles[variant],
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        pulse && "animate-pulse",
        className
      )}
    >
      {pulse && (
        <span className={clsx("h-1.5 w-1.5 rounded-full", {
          "bg-emerald-600": variant === "success",
          "bg-amber-600": variant === "warning",
          "bg-red-600": variant === "error",
          "bg-sky-600": variant === "info",
          "bg-gray-600": variant === "neutral",
          "bg-purple-600": variant === "purple",
        })} />
      )}
      {label}
    </span>
  );
}

export function PriorityBadge({ level }: { level: number }) {
  if (level <= 2) return <StatusBadge label={`ESI ${level}`} variant="success" />;
  if (level <= 3) return <StatusBadge label={`ESI ${level}`} variant="warning" />;
  return <StatusBadge label={`ESI ${level}`} variant="error" pulse />;
}

export function OrderStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "pending" || s === "ordered") return <StatusBadge label={status} variant="warning" pulse />;
  if (s === "in_progress" || s === "in progress" || s === "collected") return <StatusBadge label={status} variant="info" />;
  if (s === "completed" || s === "verified" || s === "dispensed" || s === "released") return <StatusBadge label={status} variant="success" />;
  if (s === "cancelled") return <StatusBadge label={status} variant="error" />;
  return <StatusBadge label={status} variant="neutral" />;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "paid" || s === "completed") return <StatusBadge label={status} variant="success" />;
  if (s === "partial" || s === "partially_paid") return <StatusBadge label="Partial" variant="warning" />;
  if (s === "unpaid" || s === "pending") return <StatusBadge label={status} variant="error" pulse />;
  if (s === "waived") return <StatusBadge label={status} variant="purple" />;
  return <StatusBadge label={status} variant="neutral" />;
}

export function ReferralStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "completed" || s === "accepted") return <StatusBadge label={status} variant="success" />;
  if (s === "pending" || s === "sent") return <StatusBadge label={status} variant="warning" pulse />;
  if (s === "rejected" || s === "cancelled") return <StatusBadge label={status} variant="error" />;
  return <StatusBadge label={status} variant="info" />;
}
