"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

function subscribeMounted() {
  return () => {};
}

function getMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

export default function OfflineIndicator() {
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);
  const [pendingSaves, setPendingSaves] = useState(0);

  useEffect(() => {
    const checkPending = () => {
      try {
        const pending = JSON.parse(localStorage.getItem("clinops_pending") || "[]");
        setPendingSaves(pending.length);
      } catch {
        setPendingSaves(0);
      }
    };
    checkPending();

    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;
  if (online && pendingSaves === 0) return null;

  return (
    <div
      className={`sticky top-0 z-50 px-4 py-2 text-xs font-bold text-center transition-all ${
        online
          ? "bg-amber-50 border-b border-amber-200 text-amber-800"
          : "bg-red-50 border-b border-red-200 text-red-800"
      }`}
      role="alert"
      aria-live="polite"
    >
      {online ? (
        <span>
          {pendingSaves} pending save{pendingSaves !== 1 ? "s" : ""} — will sync when connection is stable.
        </span>
      ) : (
        <span>
          You are offline. Showing cached data. Changes will be saved when you reconnect.
        </span>
      )}
    </div>
  );
}