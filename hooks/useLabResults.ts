"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LabResult } from "@/types/lab";

export function useLabResults(
  encounterId: number | null,
  token: string | null,
  enabled: boolean
) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!encounterId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/encounters/${encounterId}/lab-results`, token);
      const data = res?.data?.data ?? res?.data ?? [];
      setResults(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lab results");
    } finally {
      setLoading(false);
    }
  }, [encounterId, token]);

  useEffect(() => {
    if (enabled) void fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [enabled, fetchData]);

  return { results, loading, error, refetch: fetchData };
}
