"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ImagingRequest } from "@/types/imaging";

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

  return { requests, loading, error, refetch: fetchData };
}
