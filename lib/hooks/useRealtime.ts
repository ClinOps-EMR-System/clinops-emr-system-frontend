"use client";

import { useEffect, useRef } from "react";
import { getRealtime, type RealtimeMessage } from "@/lib/realtime";

interface UseRealtimeOptions {
  encounterIds?: number[];
  onEvent?: (message: RealtimeMessage) => void;
}

/**
 * Subscribes the current client to the given bridge channels for as long as
 * the component is mounted, invoking onEvent for each incoming message.
 *
 * The connection is shared app-wide (singleton); unmounting only removes this
 * component's handlers and re-sends the remaining subscription set.
 */
export function useRealtime(channels: string[], options: UseRealtimeOptions = {}) {
  const { encounterIds = [], onEvent } = options;
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const channelsKey = channels.join(",");
  const encounterKey = encounterIds.join(",");

  useEffect(() => {
    const realtime = getRealtime();
    realtime.subscribe(channels, encounterIds);

    const unsubscribe = channels.map((channel) =>
      realtime.on(channel, (message) => {
        handlerRef.current?.(message);
      }),
    );

    return () => {
      unsubscribe.forEach((off) => off());
      realtime.unsubscribe(channels);
    };
  }, [channelsKey, encounterKey, channels, encounterIds]);
}
