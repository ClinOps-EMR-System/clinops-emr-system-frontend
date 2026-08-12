"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AdminSidebarContextProps {
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextProps>({
  openMobile: false,
  setOpenMobile: () => {},
});

export function useAdminSidebar() {
  return useContext(AdminSidebarContext);
}

export function AdminSidebarProvider({ children }: { children: React.ReactNode }) {
  const [openMobile, setOpenMobile] = useState(false);
  return (
    <AdminSidebarContext.Provider value={{ openMobile, setOpenMobile }}>
      {children}
    </AdminSidebarContext.Provider>
  );
}
