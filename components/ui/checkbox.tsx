"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Checkbox({
  checked,
  onCheckedChange,
  disabled,
  className,
}: {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border border-input accent-[var(--clinical-primary)]",
        className,
      )}
      checked={!!checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  );
}
