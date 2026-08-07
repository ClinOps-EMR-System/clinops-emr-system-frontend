# Lab Results in Consultation — Frontend Design

Date: 2026-08-06
Status: Approved (approach + design signed off by user)
Repos: `clinops-emr-system-frontend` (primary), `ClinOps-EMR-System-backend` (backend already on `main`)

## Goal

Surface released lab results to the clinician inside the SOAP consultation view
(`app/(app)/patients/[id]/consultation/page.tsx`) via a new "Results" sub-tab,
with abnormal/critical values color-coded and a count of lab work still in
progress. In parallel, finalize and commit the in-flight lab page status rework
and Topbar notification work that is currently uncommitted on the `billing` branch.

## Scope

In scope:

- "Results" sub-tab in the consultation view (released results, color-coded flags, pending count).
- Commit/polish of in-flight work: `lab/page.tsx`, `lab/request/page.tsx`,
  `lab/layout.tsx`, `components/layout/Topbar.tsx`, `hooks/useAdmissions.ts`,
  `lib/admissions.ts`, `package.json`, `__tests__/lab-page.test.tsx`,
  `__tests__/topbar-notifications.test.tsx`.
- Small queue/error fixes already in the working tree (nurse-station, triage-queue
  encounter filter; emergency-triage error guard) as a separate cleanup commit.

Out of scope:

- Real-time push wiring (laravel-echo / pusher-js deps stay in `package.json`, unused for now).
- Adoption of shared `types/lab.ts` by the lab page (future cleanup).
- Any backend changes (backend `main` already provides the endpoints).

## Data contract (backend, already merged)

- `GET /encounters/{encounter}/lab-results` — returns released lab results for an
  encounter, envelope `{ status, message, data: LabResult[] }`, sorted
  `released_at` descending. Each `LabResult` carries:

  ```
  {
    id, lab_request_id,
    result_value_numeric, result_value_text, unit, reference_range,
    is_abnormal, is_critical, status: "released",
    released_at, released_by,
    lab_request: { id, test_name, loinc_code, status },
    released_by: { id, name }
  }
  ```

- Pending count is derived client-side from the orders already loaded in the
  consultation page: count orders where `order_type === "lab"` and `status` is
  not `"completed"` and not `"cancelled"`. No extra request.

## Frontend

### Types — `types/lab.ts` (new)

Shared `LabResult` and `LabOrder` TypeScript interfaces matching the contract
above (LabResult at minimum: id, lab_request_id, result_value_numeric/text, unit,
reference_range, is_abnormal, is_critical, status, released_at, released_by,
lab_request { id, test_name, loinc_code }, releasedBy { id, name }).

### Hook — `hooks/useLabResults.ts` (new)

`useLabResults(encounterId: number | null, token: string | null, enabled: boolean)`.

- Fetches `GET /encounters/{id}/lab-results` lazily once `enabled` becomes true.
- Normalizes the `{ data: [...] }` envelope (`res.data.data || res.data`).
- Returns `{ results, loading, error, refetch }`.
- No polling (per user decision); refresh is manual via `refetch`.

### Component — `components/consultation/LabResultsPanel.tsx` (new)

Props: `{ encounterId, token, pendingCount }`. Owns `useLabResults`.

- Header: "Laboratory Results" title, `"{n} test(s) still in progress"` line when
  `pendingCount > 0`, Refresh button.
- Empty state (`EmptyState`): "No results released yet."
- Error state: inline error banner with Retry button.
- Loading: `Skeleton` rows (matches other tabs).
- Result rows: test name; value + unit in monospace; reference range for numeric
  results; abnormal => amber text + "Abnormal" badge; critical => red text +
  "Critical" badge; normal => no badge; footer `Released {timeAgo} · by
  {releasedBy.name}` using `date-fns` `formatDistanceToNow`.

### Consultation page — `app/(app)/patients/[id]/consultation/page.tsx`

- Add `"results"` to the `SubTab` union.
- Insert `{ key: "results", label: "Results", icon: <FlaskConical /> }` in
  `subTabs` between Orders and Rx.
- Derive `pendingLabCount` from the existing `orders` state: count orders where
  `order_type === "lab"` and `status` is not `"completed"` and not `"cancelled"`.
- Render `<LabResultsPanel encounterId={summary?.encounter?.id} token={token}
  pendingCount={pendingLabCount} />` when `activeSubTab === "results"`.

### Verification

- `npm test` — new `__tests__/lab-results-panel.test.tsx` plus existing
  `lab-page.test.tsx` and `topbar-notifications.test.tsx` all pass.
- `npm run lint` clean.
- `npm run build` (typechecks) passes.

## Testing

`__tests__/lab-results-panel.test.tsx` (mocks `@/lib/api` and `@/store/RoleContext`
per existing test style):

- Released results render (test name, value + unit, reference range, released meta).
- Pending count line renders when pendingCount > 0.
- Empty state when no results.
- "Abnormal" badge on abnormal results; "Critical" badge on critical results.
- Refresh button triggers refetch (api.get called again).
- Loading skeleton while first fetch is in flight.

## Commits (logical, on `billing`)

1. Lab page status rework — `lab/page.tsx`, `lab/request/page.tsx`,
   `lab/layout.tsx`, `__tests__/lab-page.test.tsx`.
2. Topbar notifications — `components/layout/Topbar.tsx`, `hooks/useAdmissions.ts`,
   `lib/admissions.ts`, `__tests__/topbar-notifications.test.tsx`, `package.json`,
   `package-lock.json`.
3. Consultation Results tab — this design's files.
4. Cleanup — nurse-station / triage-queue encounter filter, emergency-triage error guard.

Run `npm test`, `npm run lint`, `npm run build` before each commit.
