"use client";

import Sidebar from "../../components/layout/Sidebar";
import Topbar from "../../components/layout/Topbar";
import { useAuth } from "../../store/RoleContext";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

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
    return null; // AuthProvider automatically triggers redirect to /auth
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-clinical-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#fcf9f8] text-[#1b1c1c] focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
