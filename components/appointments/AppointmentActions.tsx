"use client";

import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { useState, useCallback } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Appointment {
  id: number;
  patient_id: number;
  status: string;
}

interface AppointmentActionsProps {
  appointment: Appointment;
  onAction: () => void;
}

export function AppointmentActions({ appointment, onAction }: AppointmentActionsProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const status = appointment.status?.toLowerCase();
  const canCheckIn = ["confirmed", "pending", "scheduled"].includes(status);
  const canCancel = !["completed", "cancelled", "checked-in", "arrived"].includes(status);

  const handleCheckIn = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    try {
      await api.post(`/appointments/${appointment.id}/check-in`, {}, token);
      onAction();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setActionError(apiErr.message || "Check-in failed");
    } finally {
      setLoading(false);
    }
  }, [appointment.id, token, onAction]);

  const handleCancel = useCallback(async () => {
    setCancelOpen(false);
    setLoading(true);
    setActionError(null);
    try {
      await api.post(`/appointments/${appointment.id}/cancel`, {}, token);
      onAction();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setActionError(apiErr.message || "Cancel failed");
    } finally {
      setLoading(false);
    }
  }, [appointment.id, token, onAction]);

  return (
    <div className="flex items-center gap-2">
      {canCheckIn && (
        <button
          onClick={handleCheckIn}
          disabled={loading}
          className="text-xs font-bold text-brand-green hover:text-brand-green/80 uppercase tracking-wider disabled:opacity-50"
        >
          Check In
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => setCancelOpen(true)}
          disabled={loading}
          className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider disabled:opacity-50"
        >
          Cancel
        </button>
      )}
      {actionError && (
        <span className="text-xs text-red-600">{actionError}</span>
      )}
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void handleCancel()}
        title="Cancel this appointment?"
        message="The appointment will be marked as cancelled and the slot released."
        confirmLabel="Cancel appointment"
        variant="warning"
      />
    </div>
  );
}
