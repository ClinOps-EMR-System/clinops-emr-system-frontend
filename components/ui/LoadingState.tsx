"use client";

import React from "react";

interface LoadingStateProps {
  message?: string;
  fullPage?: boolean;
}

export default function LoadingState({ message = "Loading...", fullPage = false }: LoadingStateProps) {
  if (fullPage) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-teal border-t-transparent mx-auto" />
          <p className="mt-3 text-sm font-mono text-gray-500">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
      <span className="text-sm font-mono text-gray-500">{message}</span>
    </div>
  );
}
