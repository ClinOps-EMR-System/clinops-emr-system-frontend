# Lab Results Realtime Modal — Frontend Design

Date: 2026-08-07
Status: Approved (approach + design signed off by user)
Repo: `clinops-emr-system-frontend`

## Goal

When a lab result is released, the backend Postgres trigger emits
`pg_notify('clinops_lab_results', …)`, the Node WebSocket bridge
(`ClinOps-EMR-System-backend/WebSocketBridge/server.js`, port 6001) forwards it
to all connected clients, and this design makes the **consultation page** consume
it: lists refresh in place (no auto-open — per user decision), and the clinician
opens a **result modal from the Orders tab** by clicking a "View Result" affordance.
A global realtime provider + central modal bus (user-selected approach B) powers it.

## Scope

In scope:

- Global singleton WebSocket client + React provider (`RealtimeProvider`).
- Global lab-result bus (`LabResultBusProvider`) with a result inbox, arrival toast,
  and the central result modal.
- Orders tab: per-order "View Result" button when a released result exists, opening
  the central modal.
- On WS arrival for the current encounter: refetch the orders and lab-results lists
  (in-place refresh only — **no auto-opening the modal**).
- Tests for the realtime client, the bus, and the modal; existing tests keep passing.

Out of scope:

- Auto-opening the modal on arrival (explicitly declined by user).
- Auth/scoping on the bridge (it broadcasts to all clients; the client filters by
  `encounter_id`).
- Subscribing to `clinops_lab_requests`, `clinops_vital_signs`, etc. (the bus is
  extensible, but only `clinops_lab_results` is wired now).
- Backend changes; pusher/laravel-echo remain unused.

## Data contract

### WS event (from bridge, already live)

```
{ channel: "clinops_lab_results", data: {
    event, lab_result_id, lab_request_id, encounter_id, patient_id,
    result_value, unit, is_critical, is_abnormal, status, color, priority, occurred_at
} }
```

The payload is a *signal*, not the source of truth (it lacks `test_name`,
`reference_range`, `released_by`). On arrival the bus fetches full detail from:

### REST (already merged)

- `GET /lab-results/{id}` — `LabResult` with `lab_request` + `verified_by` loaded.
  Note: this endpoint does **not** eager-load `released_by`, and the WS payload's
  `result_value` is a single string. The modal must render the released-by line and
  reference range **conditionally**; the bus maps WS `result_value` → `result_value_text`
  as an inbox fallback.
- `GET /encounters/{encounterId}/lab-results` — released results list (already used
  by `useLabResults`).
- `GET /orders?patient_id=&encounter_id=` — each order already eager-loads
  `lab_requests[].results[]`, so the Orders tab can render "View Result" with no
  new endpoint.

## Frontend

### 1. `lib/config.ts` (modify)

Add:

```ts
const DEFAULT_WS_URL = "ws://localhost:6001";

export function getWsUrl() {
  const configured = process.env.NEXT_PUBLIC_WS_URL?.trim();
  return configured || DEFAULT_WS_URL;
}
```

### 2. `lib/realtime.ts` (new) — singleton WS client

- Lazy `connect()` (guard `typeof window`, `navigator.onLine`).
- `subscribe(channel: string, handler: (data: unknown) => void): () => void`.
- `getStatus(): "connected" | "connecting" | "offline"` + status listener.
- Auto-reconnect with backoff (1s → 2s → 5s cap); re-register all handlers after
  reconnect.
- Route incoming `{ channel, data }` to per-channel handlers.

### 3. `store/RealtimeContext.tsx` (new)

- `RealtimeProvider` (connects on mount, disconnects on unmount).
- `useRealtime()` → `{ subscribe, status }`.

### 4. `store/LabResultBus.tsx` (new)

- `LabResultBusProvider` — requires `RealtimeProvider` and `ToastProvider` above it,
  and `useAuth()` (token) available.
- On mount subscribes to `clinops_lab_results`.
- On event: `api.get("/lab-results/{lab_result_id}", token)` → append `LabResult`
  to a capped inbox (e.g. latest 20) → `toast.info("Lab result received: {test_name}")`.
- Exposes `useLabResultBus()`:
  ```ts
  { inbox: LabResult[]; dismiss(id: number): void;
    openResult(id: number): void; activeResult: LabResult | null; clearActive(): void }
  ```
- Renders `<LabResultModal>` at provider root when `activeResult` is set.
- If fetch fails (e.g. bridge event for a result the clinician can't view), still
  append the WS payload shape to the inbox so lists can refresh; modal uses full
  detail when available.

### 5. `components/consultation/LabResultModal.tsx` (new)

Presentational: `Modal size="md"` from `@/components/ui/Modal` with:

- Title: `lab_request.test_name`; subtitle: value + unit, reference range.
- Badges: Critical (destructive) / Abnormal (secondary + amber) when flagged.
- Meta: status, released by / at (`date-fns` `format`), `occurred_at`.
- Footer: Close button.

### 6. `app/(app)/layout.tsx` (modify)

Wrap children inside `ToastProvider`:

```tsx
<RealtimeProvider>
  <LabResultBusProvider>
    …existing SidebarProvider/sidebar/topbar/main…
  </LabResultBusProvider>
</RealtimeProvider>
```

### 7. Consultation page `app/(app)/patients/[id]/consultation/page.tsx` (modify)

- Extend the local `Order` interface with
  `lab_requests?: { id: number; test_name: string; status: string; results: LabResult[] }[]`.
- Subscribe via `useRealtime()` to `clinops_lab_results`; when `data.encounter_id`
  equals the active encounter, call `fetchConsultationData()` (orders + results
  lists refresh in place).
- Orders tab: for each order with `order.lab_requests?.[0]?.results?.length`, render
  a **View Result** button that calls `openResult(result.id)`.

## Data flow

DB trigger → `pg_notify('clinops_lab_results')` → Node bridge → WS
`{ channel, data }` → `lib/realtime.ts` routes → `LabResultBus` (fetch detail →
inbox → toast) **and** consultation page (refetch lists) → click **View Result** →
central `LabResultModal` (full REST detail).

## Error handling

- Bridge down / never connected → `status: "offline"`; no toasts; lists still work
  via the existing manual Refresh; reconnection is automatic.
- Result detail fetch fails → inbox keeps the WS payload (value/unit/critical flags),
  modal shows what it has; toast still fires.
- Duplicate events (same `lab_result_id`) → de-dupe by id in the inbox.

## Testing

New tests (mirror existing `__tests__` style: `vi.hoisted` + `vi.mock`, mock
`@/lib/api`, `@/store/RoleContext`):

- `__tests__/realtime.test.ts` — message routing to per-channel handlers; reconnect
  re-registers handlers; offline guard (mock global `WebSocket`).
- `__tests__/lab-result-bus.test.tsx` — fake `clinops_lab_results` event → detail
  fetched, inbox updated, toast fired; `openResult` renders the modal; duplicate
  events de-duped.
- `__tests__/lab-result-modal.test.tsx` — renders test name, value + unit, reference
  range, Critical/Abnormal badges, released meta (mirror `modal.test.tsx`).

## Verification

- `npm test` — new + existing tests pass.
- `npm run lint` clean.
- `npm run build` (typechecks) passes.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js
  code (installed Next has breaking changes vs. public docs); heed deprecation notices.

## Non-goals (kept out intentionally)

- No auto-open of the modal on arrival (user choice).
- No per-user/per-channel server-side filtering.
- No other channels wired into the bus yet.
