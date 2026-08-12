"use client";

import { getRealtimeUrl } from "./config";

/**
 * Realtime client for the ClinOps WebSocketBridge.
 *
 * Protocol (see backend/WebSocketBridge/server.js):
 *   Client → Server:  { type: "subscribe", channels: string[], encounter_ids?: number[] }
 *                     { type: "unsubscribe", channels?: string[] }
 *                     { type: "ping" }
 *   Server → Client:  { type: "connected" | "subscribed" | "unsubscribed" | "pong" | "error" }
 *                     { channel: string, data: payload }
 *
 * Payloads carry an `event_type` (e.g. "lab_result.verified") plus contextual
 * ids. Encounter-scoped channels (lab requests/results, radiology, billing)
 * are only delivered when the client subscribes with the relevant encounter_ids.
 */

export interface RealtimeMessage {
  channel: string;
  data: Record<string, unknown>;
}

export type RealtimeHandler = (message: RealtimeMessage) => void;

const RECONNECT_BASE_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 30000;
const HEARTBEAT_INTERVAL_MS = 30000;

class RealtimeClient {
  private ws: WebSocket | null = null;

  private url: string;

  private handlers = new Map<string, Set<RealtimeHandler>>();

  private subscriptions = new Set<string>();

  private encounterIds = new Set<number>();

  private reconnectAttempts = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private manuallyClosed = false;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (typeof window === "undefined") return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.manuallyClosed = false;

    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.resubscribe();
      this.startHeartbeat();
    };

    this.ws.onmessage = (event: MessageEvent<string>) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === "pong" || msg.type === "connected" || msg.type === "subscribed") return;

      const channel = msg.channel as string | undefined;
      if (!channel || !this.handlers.has(channel)) return;

      const data = (msg.data ?? {}) as Record<string, unknown>;
      this.handlers.get(channel)?.forEach((handler) => handler({ channel, data }));
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      if (!this.manuallyClosed) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  subscribe(channels: string[], encounterIds: number[] = []) {
    const hadNewChannels = channels.some((c) => !this.subscriptions.has(c));
    channels.forEach((c) => this.subscriptions.add(c));
    encounterIds.forEach((id) => this.encounterIds.add(id));

    if (hadNewChannels || encounterIds.length > 0) {
      this.sendSubscribe();
    }

    this.connect();
  }

  unsubscribe(channels: string[]) {
    channels.forEach((c) => this.subscriptions.delete(c));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "unsubscribe", channels }));
    }
  }

  on(channel: string, handler: RealtimeHandler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)?.add(handler);

    return () => {
      this.handlers.get(channel)?.delete(handler);
    };
  }

  disconnect() {
    this.manuallyClosed = true;
    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.ws?.close();
    this.ws = null;
  }

  private sendSubscribe() {
    if (this.ws?.readyState !== WebSocket.OPEN) return;

    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        channels: Array.from(this.subscriptions),
        encounter_ids: Array.from(this.encounterIds),
      }),
    );
  }

  private resubscribe() {
    if (this.subscriptions.size === 0) return;
    this.sendSubscribe();
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.manuallyClosed) return;

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempts,
      RECONNECT_MAX_DELAY_MS,
    );
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

let realtime: RealtimeClient | null = null;

/** Returns the shared singleton connection (created lazily in the browser). */
export function getRealtime(): RealtimeClient {
  if (!realtime) {
    realtime = new RealtimeClient(getRealtimeUrl());
  }
  return realtime;
}
