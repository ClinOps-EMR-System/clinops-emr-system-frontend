"use client";

import React from "react";
import clsx from "clsx";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={clsx("flex flex-col sm:flex-row justify-between sm:items-center gap-4", className)}>
      <div>
        <h1 className="text-3xl font-bold text-[#1b1c1c]">{title}</h1>
        {description && (
          <p className="text-sm text-[#5f5e5e] mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

interface PageCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PageCard({ children, className }: PageCardProps) {
  return (
    <div className={clsx("bg-white rounded border border-[#becab7]/50 p-6", className)}>
      {children}
    </div>
  );
}

interface FormActionsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel: string;
  loading?: boolean;
  loadingLabel?: string;
}

export function FormActions({ onCancel, onSubmit, submitLabel, loading, loadingLabel }: FormActionsProps) {
  return (
    <div className="flex gap-4 border-t border-gray-100 pt-6 justify-end">
      <button
        type="button"
        onClick={onCancel}
        className="px-5 py-2 border border-gray-300 rounded text-sm font-bold text-[#5f5e5e] hover:bg-gray-50 focus:outline-none transition-colors"
      >
        Cancel
      </button>
      <button
        type={onSubmit ? "button" : "submit"}
        disabled={loading}
        onClick={onSubmit}
        className="px-6 py-2 bg-clinical-primary hover:bg-clinical-primary-hover text-white rounded font-bold text-sm shadow-sm transition-all focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? (loadingLabel || "Saving...") : submitLabel}
      </button>
    </div>
  );
}
