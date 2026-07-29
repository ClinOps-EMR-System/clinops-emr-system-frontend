"use client";

import React from "react";
import clsx from "clsx";

interface PhoneFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string[];
  hint?: string;
  required?: boolean;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

const formatDigits = (v: string, maxLen: number = 9) => v.replace(/\D/g, "").slice(0, maxLen);

export default function PhoneField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  id,
  placeholder = "999 999 999",
  disabled,
  maxLength = 9,
}: PhoneFieldProps) {
  const fieldId = id || label.toLowerCase().replace(/\s+/g, "-");
  const hasError = error && error.length > 0;

  return (
    <div className="space-y-1">
      <label
        htmlFor={fieldId}
        className="block text-xs font-bold text-gray-500 uppercase tracking-wide"
      >
        {label}
        {required && <span className="text-clinical-error ml-0.5">*</span>}
      </label>
      <div className="flex">
        <span className="inline-flex items-center px-2.5 border border-r-0 border-gray-300 rounded-l bg-gray-50 text-gray-500 text-xs font-mono select-none tracking-tight">
          +265
        </span>
        <input
          id={fieldId}
          type="tel"
          inputMode="numeric"
          maxLength={maxLength}
          aria-describedby={hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          aria-invalid={hasError}
          className={clsx(
            "flex-1 px-2.5 py-2 border rounded-r text-sm font-medium text-gray-900 font-mono",
            "focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary",
            "transition-colors duration-150",
            hasError ? "border-clinical-error bg-red-50" : "border-gray-300",
            disabled && "bg-gray-50 text-gray-500 cursor-not-allowed"
          )}
          value={value}
          onChange={(e) => onChange(formatDigits(e.target.value, maxLength))}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
        />
      </div>
      {hasError && (
        <p id={`${fieldId}-error`} className="text-xs text-clinical-error mt-1" role="alert">
          {error.join(" ")}
        </p>
      )}
      {!hasError && hint && (
        <p id={`${fieldId}-hint`} className="text-[11px] text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
}
