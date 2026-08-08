"use client";

import { useEffect, useState } from "react";

interface Shortcut {
  key: string;
  label: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: "Ctrl+Enter", label: "Save current form", description: "Submit the active form" },
  { key: "Escape", label: "Cancel / Close", description: "Close modals, dropdowns, or cancel" },
  { key: "Tab", label: "Next field", description: "Move to next form field" },
  { key: "Shift+Tab", label: "Previous field", description: "Move to previous form field" },
  { key: "?", label: "Keyboard shortcuts", description: "Toggle this help overlay" },
  { key: "1-6", label: "Switch tabs", description: "Navigate triage tabs by number (1=Chief Complaint, 2=Vitals, 3=Allergies)" },
];

export default function KeyboardShortcutsOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle help with ?
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
          e.preventDefault();
          setOpen((prev) => !prev);
        }
      }
      // Close with Escape
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Keyboard Shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-600 cursor-pointer"
            aria-label="Close shortcuts"
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{s.description}</span>
              <kbd className="ml-4 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono font-bold text-gray-700 whitespace-nowrap">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 bg-[#fcf9f8] border-t border-gray-100 text-xs text-gray-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded font-mono">?</kbd> to toggle this overlay
        </div>
      </div>
    </div>
  );
}