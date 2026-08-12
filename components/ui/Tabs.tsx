"use client";

import React, { useState, useCallback, useId } from "react";
import clsx from "clsx";

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey?: string;
  onChange: (key: string) => void;
  className?: string;
  size?: "sm" | "md";
}

export default function Tabs({ tabs, activeKey: controlledActiveKey, onChange, className, size = "md" }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.key || "");
  const activeKey = controlledActiveKey ?? internalActive;
  const tablistId = useId();

  const handleChange = useCallback(
    (key: string) => {
      setInternalActive(key);
      onChange(key);
    },
    [onChange]
  );

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      id={tablistId}
      onKeyDown={(e) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
        e.preventDefault();
        const idx = tabs.findIndex((t) => t.key === activeKey);
        let next: number;
        if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
        else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === "Home") next = 0;
        else next = tabs.length - 1;
        document.getElementById(`${tablistId}-tab-${tabs[next].key}`)?.focus();
        handleChange(tabs[next].key);
      }}
      className={clsx(
        "flex gap-0 border-b border-gray-200",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            role="tab"
            id={`${tablistId}-tab-${tab.key}`}
            aria-controls={`${tablistId}-panel-${tab.key}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleChange(tab.key)}
            className={clsx(
              "flex items-center gap-2 font-bold uppercase tracking-wider transition-all duration-150 border-b-2 whitespace-nowrap",
              size === "sm" ? "px-3 py-2 text-[11px]" : "px-4 py-3 text-xs",
              isActive
                ? "border-clinical-primary text-clinical-primary"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold",
                  isActive
                    ? "bg-clinical-primary/10 text-clinical-primary"
                    : "bg-gray-100 text-gray-500"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  tabKey: string;
  activeKey: string;
  tablistId: string;
  children: React.ReactNode;
}

export function TabPanel({ tabKey, activeKey, tablistId, children }: TabPanelProps) {
  if (tabKey !== activeKey) return null;

  return (
    <div
      role="tabpanel"
      id={`${tablistId}-panel-${tabKey}`}
      aria-labelledby={`${tablistId}-tab-${tabKey}`}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
