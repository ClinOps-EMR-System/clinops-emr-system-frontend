"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/store/RoleContext";
import { useRealtime } from "@/store/RealtimeContext";
import { useToast } from "@/components/ui/Toast";
import LabResultModal from "@/components/consultation/LabResultModal";
import { api } from "@/lib/api";
import type { LabResult, LabResultEvent } from "@/types/lab";

const MAX_INBOX = 20;

interface LabResultBusValue {
  inbox: LabResult[];
  dismiss: (id: number) => void;
  openResult: (id: number) => void;
  activeResult: LabResult | null;
  clearActive: () => void;
}

const LabResultBusContext = createContext<LabResultBusValue | undefined>(undefined);

function fallbackResult(ev: LabResultEvent): LabResult {
  return {
    id: ev.lab_result_id,
    lab_request_id: ev.lab_request_id,
    result_value_numeric: null,
    result_value_text: ev.result_value,
    unit: ev.unit,
    reference_range: null,
    is_abnormal: ev.is_abnormal,
    is_critical: ev.is_critical,
    status: ev.status,
    released_at: ev.occurred_at,
    released_by: null,
  };
}

export function LabResultBusProvider({ children }: { children: React.ReactNode }) {
  const { subscribe } = useRealtime();
  const { user, token } = useAuth();
  const toast = useToast();
  const [inbox, setInbox] = useState<LabResult[]>([]);
  const [activeResult, setActiveResult] = useState<LabResult | null>(null);

  const inboxRef = useRef<LabResult[]>(inbox);

  useEffect(() => {
    inboxRef.current = inbox;
  }, [inbox]);

  useEffect(() => {
    const off = subscribe("clinops_lab_results", async (raw: unknown) => {
      const ev = raw as LabResultEvent;
      if (!ev || typeof ev.lab_result_id !== "number") return;
      if (ev.status !== "released") return;
      if (inboxRef.current.some((r) => r.id === ev.lab_result_id)) return;

      let result: LabResult;
      try {
        const res = await api.get(`/lab-results/${ev.lab_result_id}`, token);
        const fetched = (res?.data?.id ? res.data : res?.id ? res : undefined) as LabResult | undefined;
        result = fetched ?? fallbackResult(ev);
      } catch {
        result = fallbackResult(ev);
      }

      setInbox((prev) => [result, ...prev].slice(0, MAX_INBOX));

      const isOrderingDoctor = user?.id != null && result.lab_request?.ordered_by === user.id;
      if (!isOrderingDoctor) return;

      const testName = result.lab_request?.test_name ?? `Lab result #${result.id}`;
      const value = result.result_value_text ?? result.result_value_numeric;
      const detail = value != null ? ` — ${value}${result.unit ? ` ${result.unit}` : ""}` : "";
      toast.info(`Lab result ready: ${testName}${detail}`);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token, user?.id]);

  const value = useMemo<LabResultBusValue>(
    () => ({
      inbox,
      dismiss: (id) => setInbox((prev) => prev.filter((r) => r.id !== id)),
      openResult: (id) => {
        const found = inboxRef.current.find((r) => r.id === id);
        if (found) setActiveResult(found);
      },
      activeResult,
      clearActive: () => setActiveResult(null),
    }),
    [inbox, activeResult]
  );

  return (
    <LabResultBusContext.Provider value={value}>
      {children}
      {activeResult && <LabResultModal result={activeResult} onClose={() => setActiveResult(null)} />}
    </LabResultBusContext.Provider>
  );
}

export function useLabResultBus() {
  const context = useContext(LabResultBusContext);
  if (!context) throw new Error("useLabResultBus must be used within a LabResultBusProvider");
  return context;
}
