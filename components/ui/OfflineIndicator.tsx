"use client";

import { useEffect, useState } from "react";

export default function OfflineIndicator() {
  const [online, setOnline] = useState(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingSaves, setPendingSaves] = useState(0);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check for pending saves on interval
    const checkPending = setInterval(() => {
      try {
        const pending = JSON.parse(localStorage.getItem("clinops_pending") || "[]");
        setPendingSaves(pending.length);
      } catch {
        setPendingSaves(0);
      }
    }, 5000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(checkPending);
    };
  }, []);

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