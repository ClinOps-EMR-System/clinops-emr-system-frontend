"use client";

import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminSidebarProvider } from "@/components/admin/AdminSidebarContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <AdminSidebarProvider>
        <a
          href="#admin-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[200] focus:rounded-md focus:bg-clinical-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          Skip to main content
        </a>
        <div className="flex h-screen overflow-hidden bg-[var(--clinical-bg)] text-[var(--clinical-text)]">
          <AdminSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AdminTopbar />
            <main id="admin-main-content" tabIndex={-1} className="flex-1 overflow-y-auto p-4 md:p-6 focus:outline-none"><ErrorBoundary>{children}</ErrorBoundary></main>
          </div>
        </div>
      </AdminSidebarProvider>
    </AdminGuard>
  );
}
