"use client";

import { getWsUrl } from "./config";

export type RealtimeStatus = "connecting" | "connected" | "offline";

const handlers = new Map<string, Set<(data: unknown) => void>>();
const statusListeners = new Set<(s: RealtimeStatus) => void>();

let socket: WebSocket | null = null;
let status: RealtimeStatus = "offline";
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

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
  return () => statusListeners.delete(cb);
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
  if (reconnectTimer) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, reconnectDelay);
  reconnectDelay = Math.min(reconnectDelay * 2, 5000);
}

function connect() {
  if (typeof window === "undefined" || socket) return;
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
    scheduleReconnect();
  };

  ws.onerror = () => {};
}

export function subscribe(channel: string, handler: (data: unknown) => void) {
  if (!handlers.has(channel)) handlers.set(channel, new Set());
  handlers.get(channel)!.add(handler);
  connect();
  return () => {
    handlers.get(channel)?.delete(handler);
  };
}

export function closeRealtime() {
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
