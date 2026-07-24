"use client";

import { Info } from "lucide-react";

interface BackendNoteProps {
  title: string;
  items: string[];
}

export function BackendNote({ title, items }: BackendNoteProps) {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded p-5">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Info className="h-4 w-4 text-sky-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-sky-900">{title}</h3>
          <ul className="mt-2 space-y-1">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-sky-800 flex items-start gap-2">
                <span className="text-sky-400 mt-0.5">-</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
