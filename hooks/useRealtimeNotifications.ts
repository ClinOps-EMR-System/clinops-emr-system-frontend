"use client";

import { useEffect, useRef } from "react";
import { EMR_CHANNELS } from "@/lib/realtime";
import { useRealtime } from "@/store/RealtimeContext";
import { useNotifications } from "@/hooks/useAdmissions";
import { playNotificationSound } from "@/lib/notificationSound";

const DEBOUNCE_MS = 1000;
const POLL_INTERVAL_MS = 15000;

export function useRealtimeNotifications() {
  const { subscribe } = useRealtime();
  const { notifications, loading, error, refetch, markRead, markAllRead } = useNotifications(undefined, {
    interval: POLL_INTERVAL_MS,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenIdsRef = useRef<Set<number> | null>(null);

  useEffect(() => {
    if (notifications.length === 0) return;

    const current = new Set(notifications.map((n) => n.id));

    if (seenIdsRef.current === null) {
      seenIdsRef.current = current;
      return;
    }

    const fresh = notifications.filter((n) => !n.read && !seenIdsRef.current?.has(n.id));
    if (fresh.length > 0) playNotificationSound();

    seenIdsRef.current = current;
  }, [notifications]);

  useEffect(() => {
    const scheduleRefetch = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void refetch();
      }, DEBOUNCE_MS);
    };

    const offs = EMR_CHANNELS.map((channel) => subscribe(channel, scheduleRefetch));

    return () => {
      offs.forEach((off) => off());
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [subscribe, refetch]);

  return { notifications, loading, error, refetch, markRead, markAllRead };
}
