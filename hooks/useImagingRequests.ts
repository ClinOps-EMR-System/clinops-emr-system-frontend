"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { subscribe } from "@/lib/realtime";
import type { ImagingRequest } from "@/types/imaging";

const RADIOLOGY_CHANNELS = [
  "clinops_radiology_requests",
  "clinops_radiology_results",
] as const;

export function useImagingRequests(
  encounterId: number | null,
  token: string | null,
  enabled: boolean
) {
  const [requests, setRequests] = useState<ImagingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!encounterId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/encounters/${encounterId}/imaging`, token);
      const data = res?.data?.data ?? res?.data ?? [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load imaging requests");
    } finally {
      setLoading(false);
    }
  }, [encounterId, token]);

  useEffect(() => {
    if (enabled) void fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [enabled, fetchData]);

  useEffect(() => {
    if (!enabled || !encounterId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefetch = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void fetchData();
      }, 300);
    };
    const offs = RADIOLOGY_CHANNELS.map((channel) =>
      subscribe(channel, scheduleRefetch)
    );
    return () => {
      offs.forEach((off) => off());
      if (timer) clearTimeout(timer);
    };
  }, [enabled, encounterId, fetchData]);

  return { requests, loading, error, refetch: fetchData };
}
