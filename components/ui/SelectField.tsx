"use client";

import React from "react";
import clsx from "clsx";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label: string;
  options: SelectOption[];
  error?: string[];
  hint?: string;
  required?: boolean;
  placeholder?: string;
}

export default function SelectField({
  label,
  options,
  error,
  hint,
  required,
  placeholder,
  id,
  className,
  ...props
}: SelectFieldProps) {
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
      <select
        id={fieldId}
        aria-describedby={hasError ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        aria-invalid={hasError}
        className={clsx(
          "w-full px-3 py-2 border rounded bg-white text-sm font-medium text-gray-900",
          "focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary",
          "transition-colors duration-150",
          hasError ? "border-clinical-error bg-red-50" : "border-gray-300",
          props.disabled && "bg-gray-50 text-gray-500 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
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
