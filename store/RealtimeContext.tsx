"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  subscribe,
  getStatus,
  onStatusChange,
  closeRealtime,
  type RealtimeStatus,
} from "@/lib/realtime";

interface RealtimeContextValue {
  subscribe: typeof subscribe;
  status: RealtimeStatus;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeStatus>(getStatus);

  useEffect(() => {
    const off = onStatusChange(setStatus);
    return off;
  }, []);

  useEffect(() => {
    return () => closeRealtime();
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribe, status }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used within a RealtimeProvider");
  return context;
}
