"use client";

import React from "react";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../store/RoleContext";
import { ToastProvider } from "../../components/ui/Toast";
import { SidebarProvider } from "../../components/ui/sidebar";
import { AppSidebar } from "../../components/shadcn-space/blocks/sidebar-01/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white font-sans">
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
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <Topbar />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-white text-clinical-text focus:outline-none"
          >
            {children}
          </main>
        </div>
      </SidebarProvider>
    </ToastProvider>
  );
}
