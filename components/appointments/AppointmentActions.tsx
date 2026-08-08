"use client";

import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
    setConfirmOpen(true);
  }, []);

  const confirmCancel = useCallback(async () => {
    setLoading(true);
    setActionError(null);
    setConfirmOpen(false);
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
        <Button size="xs" variant="ghost" onClick={handleCheckIn} disabled={loading}>
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
          Check In
        </Button>
      )}
      {canCancel && (
        <Button size="xs" variant="ghost" onClick={handleCancel} disabled={loading}>
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          Cancel
        </Button>
      )}
      {actionError && (
        <span className="text-xs text-destructive">{actionError}</span>
      )}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmCancel}
        title="Cancel Appointment"
        message="Cancel this appointment?"
        confirmLabel="Cancel appointment"
        variant="warning"
      />
    </div>
  );
}
