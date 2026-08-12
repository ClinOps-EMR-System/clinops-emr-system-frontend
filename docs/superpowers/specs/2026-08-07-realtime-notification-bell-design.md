# Realtime Notification Bell Refresh — Design

**Date:** 2026-08-07

## Goal

Make top-bar notification-bell updates arrive instantly when realtime events occur (lab results released, orders placed, vital signs, etc.) instead of waiting for the 15s polling interval, and let clinicians click a notification to jump to the patient's consultation.

## Context

- The bell (`components/layout/Topbar.tsx`) polls `GET /notifications` every 15s via `useNotifications` (`hooks/useAdmissions.ts`).
- The backend already creates per-user DB notifications on relevant events (e.g. `VerificationNotificationService::labResultReleased` → the ordering doctor).
- The WS bridge broadcasts unauthenticated `clinops_*` channel events; the `notifications` table stays the single source of truth for read-state and per-user targeting.

## Approach: A — Realtime-triggered refresh

Frontend-only. The DB `notifications` table remains the single source of truth; the WS signal merely triggers an immediate refetch.

### Components

1. **`lib/realtime.ts`** — add exported `EMR_CHANNELS` constant (the 5 bridge channels):
   `clinops_lab_results`, `clinops_lab_requests`, `clinops_vital_signs`, `clinops_consultation_queue`, `clinops_chart_edited`.
2. **`hooks/useRealtimeNotifications.ts`** (new) — wraps `useNotifications` (same return shape).
   Uses `useRealtime().subscribe` to attach one handler per channel; each message schedules a **~1s debounced `refetch()`**. 15s polling is preserved as fallback.
3. **`components/layout/Topbar.tsx`** — swap `useNotifications` for `useRealtimeNotifications`; extend `NotificationItem` with `patientId?: number` (from `NotificationData.patient_id`); on click: mark read, then if `patientId` exists navigate to `/patients/{id}/consultation` and close the dropdown.

### Data flow

Postgres trigger → bridge → WS → debounced refetch → `GET /notifications` → bell list + unread dot update instantly.

## Error handling

- **Race:** the WS event fires in the same transaction as the lab update, before Laravel inserts the Notification row. The 1s debounce lands the refetch after that commit and batches rapid bursts.
- **Bridge down:** no events → existing 15s polling continues. Debounce timer is cleared on unmount and on subscription cleanup.
- **Navigation:** only for notifications with `patient_id`; others keep mark-read-only. The consultation page already handles "no active encounter".

## Non-goals

- No backend changes (no per-user WS channel, no auth in the bridge).
- No optimistic bell items rendered from WS payloads (privacy/noise).

## Testing

Skipped per user instruction. Verification via lint + `npm run build`.
