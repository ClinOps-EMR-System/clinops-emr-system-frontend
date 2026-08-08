"use client";

import { getWsUrl } from "./config";

export type RealtimeStatus = "connecting" | "connected" | "offline";

export const EMR_CHANNELS = [
  "clinops_lab_results",
  "clinops_lab_requests",
  "clinops_vital_signs",
  "clinops_consultation_queue",
  "clinops_chart_edited",
  "clinops_pharmacy_queue",
  "clinops_billing_invoices",
] as const;

const handlers = new Map<string, Set<(data: unknown) => void>>();
const statusListeners = new Set<(s: RealtimeStatus) => void>();

let socket: WebSocket | null = null;
let status: RealtimeStatus = "offline";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
let manuallyClosed = false;

function setStatus(next: RealtimeStatus) {
  if (status === next) return;
  status = next;
  statusListeners.forEach((cb) => cb(status));
}

export function getStatus() {
  return status;
}

export function onStatusChange(cb: (s: RealtimeStatus) => void) {
  statusListeners.add(cb);
  return () => {
    statusListeners.delete(cb);
  };
}

export function routeMessage(raw: string) {
  let msg: { channel?: string; data?: unknown };
  try {
    msg = JSON.parse(raw);
  } catch {
    return;
  }
  const channel = msg?.channel;
  if (!channel) return;
  const set = handlers.get(channel);
  if (!set) return;
  set.forEach((handler) => handler(msg.data));
}

function scheduleReconnect() {
  if (reconnectTimer || manuallyClosed) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 5000);
}

function connect() {
  if (typeof window === "undefined" || socket || manuallyClosed) return;
  setStatus("connecting");
  const ws = new WebSocket(getWsUrl());
  socket = ws;

  ws.onopen = () => {
    reconnectDelay = 1000;
    setStatus("connected");
  };

  ws.onmessage = (event: MessageEvent) => routeMessage(String(event.data));

  ws.onclose = () => {
    if (socket === ws) socket = null;
    setStatus("offline");
    if (!manuallyClosed) scheduleReconnect();
  };

  ws.onerror = () => {};
}

export function subscribe(channel: string, handler: (data: unknown) => void) {
  if (!handlers.has(channel)) handlers.set(channel, new Set());
  handlers.get(channel)!.add(handler);
  manuallyClosed = false;
  connect();
  return () => {
    handlers.get(channel)?.delete(handler);
  };
}

export function closeRealtime() {
  manuallyClosed = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.close();
    socket = null;
  }
  handlers.clear();
  statusListeners.clear();
  reconnectDelay = 1000;
  setStatus("offline");
}
