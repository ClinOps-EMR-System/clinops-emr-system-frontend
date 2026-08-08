"use client";

import React, { useState, useCallback, useRef, useId } from "react";
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
  const tablistRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback(
    (key: string) => {
      setInternalActive(key);
      onChange(key);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((t) => t.key === activeKey);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case "ArrowLeft":
          e.preventDefault();
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          e.preventDefault();
          nextIndex = 0;
          break;
        case "End":
          e.preventDefault();
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      const nextKey = tabs[nextIndex].key;
      handleChange(nextKey);
      const nextTab = tablistRef.current?.querySelector<HTMLElement>(
        `[role="tab"]:nth-child(${nextIndex + 1})`
      );
      nextTab?.focus();
    },
    [tabs, activeKey, handleChange]
  );

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-orientation="horizontal"
      id={tablistId}
      onKeyDown={handleKeyDown}
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
                : "border-transparent text-gray-500 hover:text-gray-600 hover:border-gray-300"
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
