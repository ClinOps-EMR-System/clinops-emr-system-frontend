"use client";

import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/realtime";

interface UseRealtimeOptions {
  encounterIds?: number[];
  onEvent?: (message: { channel: string; data: unknown }) => void;
}

/**
 * Subscribes the current client to the given bridge channels for as long as
 * the component is mounted, invoking onEvent for each incoming message.
 */
export function useRealtime(channels: string[], options: UseRealtimeOptions = {}) {
  const { onEvent } = options;
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  const channelsKey = channels.join(",");

  useEffect(() => {
    const offs = channels.map((channel) =>
      subscribe(channel, (data) => {
        handlerRef.current?.({ channel, data });
      }),
    );

    return () => {
      offs.forEach((off) => off());
    };
    // channelsKey captures channel identity; `channels` is listed for exhaustive-deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelsKey]);
}
