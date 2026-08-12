"use client";

import React, { useId } from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import Modal from "./Modal";
import clsx from "clsx";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
  children?: React.ReactNode;
}

const variantConfig = {
  danger: {
    icon: <Trash2 className="h-5 w-5 text-red-500" />,
    iconBg: "bg-red-100",
    confirmBtn: "bg-red-600 hover:bg-red-700 text-white",
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    iconBg: "bg-amber-100",
    confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white",
  },
  info: {
    icon: <Info className="h-5 w-5 text-sky-500" />,
    iconBg: "bg-sky-100",
    confirmBtn: "bg-clinical-primary hover:bg-clinical-primary-hover text-white",
  },
};

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  children,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const headingId = useId();

  return (
    <Modal open={open} onClose={onClose} title="" size="sm" labelledById={headingId}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className={clsx("h-10 w-10 rounded-full flex items-center justify-center shrink-0", config.iconBg)}>
            {config.icon}
          </div>
          <div>
            <h3 id={headingId} className="text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        {children && <div className="mt-2">{children}</div>}
      </div>
      <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={clsx(
            "px-4 py-2 rounded text-sm font-bold transition-colors disabled:opacity-50",
            config.confirmBtn
          )}
        >
          {loading ? "Processing..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
