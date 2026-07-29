"use client";

import React, { useState, useCallback, useEffect } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../store/RoleContext";
import { ToastProvider } from "../../components/ui/Toast";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Close sidebar on escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !sidebarCollapsed) {
        setSidebarCollapsed(true);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [sidebarCollapsed]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fcf9f8] font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-green border-t-transparent"></div>
          <p className="text-xs font-bold text-gray-500 font-mono tracking-widest uppercase">
            Verifying staff credentials...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-clinical-bg">
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:border focus:border-clinical-primary focus:text-clinical-primary focus:font-bold focus:text-sm"
        >
          Skip to main content
        </a>

        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#fcf9f8] text-[#1b1c1c] focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
