"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../store/RoleContext";
import { api } from "./api";

interface UseFetchOptions {
  immediate?: boolean;
  interval?: number;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFetch<T>(endpoint: string, options: UseFetchOptions = {}): UseFetchResult<T> {
  const { immediate = true, interval } = options;
  const { token } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.get(endpoint, token);
      if (!signal?.aborted && res) {
        setData(res.data ?? res);
        // Cache successful responses in localStorage
        try {
          localStorage.setItem(`clinops_cache_${endpoint}`, JSON.stringify({
            data: res.data ?? res,
            timestamp: Date.now(),
          }));
        } catch { /* quota exceeded — ignore */ }
      }
    } catch (err: unknown) {
      if (!signal?.aborted) {
        // Try to serve from cache when offline
        try {
          const cached = localStorage.getItem(`clinops_cache_${endpoint}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            setData(parsed.data);
            setError(null);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load data.");
          }
        } catch {
          setError(err instanceof Error ? err.message : "Failed to load data.");
        }
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [endpoint, token]);

  useEffect(() => {
    if (!immediate) return;
    const controller = new AbortController();
    abortRef.current = controller;
    fetchData(controller.signal); // eslint-disable-line react-hooks/set-state-in-effect
    return () => {
      controller.abort();
    };
  }, [fetchKey, immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!interval || !immediate) return;
    const id = setInterval(() => {
      fetchData();
    }, interval);
    return () => clearInterval(id);
  }, [interval, immediate, fetchData]);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  return { data, loading, error, refetch };
}
