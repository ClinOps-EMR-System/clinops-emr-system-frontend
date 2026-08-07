"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { admissionsApi } from "../lib/admissions";
import type { Admission, AdmissionStats, NotificationData } from "../types/admission";

interface UseAdmissionsOptions {
  immediate?: boolean;
  interval?: number;
}

interface UseAdmissionsResult {
  admissions: Admission[];
  stats: AdmissionStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdmissions(options: UseAdmissionsOptions = {}): UseAdmissionsResult {
  const { immediate = true, interval } = options;
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const [admRes, statsRes] = await Promise.all([
        admissionsApi.list(),
        admissionsApi.getStats(),
      ]);
      if (!signal?.aborted) {
        setAdmissions(admRes.data);
        setStats(statsRes);
      }
    } catch (err: unknown) {
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : "Failed to load admissions data");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!immediate) return;
    const controller = new AbortController();
    abortRef.current = controller;
    fetchData(controller.signal); // eslint-disable-line react-hooks/set-state-in-effect
    return () => {
      controller.abort();
    };
  }, [fetchKey, immediate, fetchData]);

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

  return { admissions, stats, loading, error, refetch };
}

interface UseAdmissionDetailOptions {
  admitOnMount?: boolean;
}

interface UseAdmissionDetailResult {
  admission: Admission | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAdmissionDetail(
  id: number | null,
  options: UseAdmissionDetailOptions = {}
): UseAdmissionDetailResult {
  const { admitOnMount = true } = options;
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await admissionsApi.getById(id);
      setAdmission(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admission");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && admitOnMount) {
      fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [id, admitOnMount, fetchData]);

  return { admission, loading, error, refetch: fetchData };
}

interface UseNotificationsOptions {
  interval?: number;
}

interface UseNotificationsResult {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(
  admissionId?: number,
  options: UseNotificationsOptions = {}
): UseNotificationsResult {
  const { interval } = options;
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await admissionsApi.getNotifications(admissionId);
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  const markRead = useCallback(async (id: number) => {
    try {
      await admissionsApi.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark notification as read");
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await admissionsApi.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: n.read_at ?? new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to mark notifications as read");
    }
  }, []);

  useEffect(() => {
    fetchNotifications(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchNotifications]);

  useEffect(() => {
    if (!interval || interval <= 0) return;
    const id = setInterval(() => {
      fetchNotifications();
    }, interval);
    return () => clearInterval(id);
  }, [interval, fetchNotifications]);

  return { notifications, unreadCount, loading, error, refetch: fetchNotifications, markRead, markAllRead };
}