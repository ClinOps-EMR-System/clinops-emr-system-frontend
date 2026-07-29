"use client";

import React from "react";
import { FileText } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="status">
      <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4" aria-hidden="true">
        {icon || <FileText className="h-6 w-6 text-gray-400" />}
      </div>
      <h3 className="text-sm font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
