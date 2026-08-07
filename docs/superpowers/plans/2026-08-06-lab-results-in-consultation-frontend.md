# Lab Results in Consultation (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Results" sub-tab to the clinician SOAP consultation view that shows released lab results (with abnormal/critical color-coding and a pending-work count), and finalize + commit the in-flight lab-page status rework and Topbar notifications work currently uncommitted on the `billing` branch.

**Architecture:** A self-contained `LabResultsPanel` component owns its data via a `useLabResults` hook that lazily calls the existing `GET /encounters/{id}/lab-results` endpoint. The consultation page only gains a sub-tab entry, a derived pending count, and one render line. In-flight work is finalized and committed in logical commits before the new feature.

**Tech Stack:** Next.js 16 (app router), React 19, TypeScript 5, Tailwind v4, shadcn/base-ui components (Card, Button, Badge, Skeleton), date-fns, Vitest 4 + Testing Library, ESLint 9.

## Global Constraints

- Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code (the installed Next version has breaking changes vs. public docs). Heed deprecation notices.
- Use the app's existing shadcn-style components: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Button`, `Badge`, `Skeleton` from `@/components/ui/*`; use `EmptyState` from `@/components/ui/EmptyState` for empty lists.
- `Badge` variants are only: `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`. There is NO `warning` variant — use `variant="secondary"` plus an amber text class instead.
- API responses use the Laravel envelope `{ status, message, data }`. Normalize with `res.data.data || res.data` (paginated/unwrapped fallback).
- Tests must mock `@/lib/api` and (when the component uses it) `@/store/RoleContext` with `vi.hoisted` + `vi.mock`, matching the existing style in `__tests__/lab-page.test.tsx`.
- Verify before each commit: `npm test`, `npm run lint`, `npm run build`. ESLint target only the files you changed: `npx eslint <paths>`.
- The working tree on `billing` has unrelated in-flight changes. `git add` ONLY the files listed in each task — never `git add -A`.
- Do not add code comments.
- The repo is on Windows (PowerShell). Use the exact commands given.

---

### Task 1: Finalize & commit lab page status rework

The lab page already contains in-flight changes for the entered → verified → released workflow, plus its test. This task verifies, fixes if needed, and commits them.

**Files:**
- Modify: `app/(app)/lab/page.tsx` (already modified — do not rewrite)
- Modify: `app/(app)/lab/request/page.tsx` (already modified)
- Create: `app/(app)/lab/layout.tsx` (already created)
- Test: `__tests__/lab-page.test.tsx` (already created)

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing for later tasks.

- [ ] **Step 1: Run the lab page test**

Run: `npm test -- __tests__/lab-page.test.tsx`
Expected: 3 tests PASS. If any fail, fix the underlying bug in `app/(app)/lab/page.tsx` (the tests assert: released results appear under the "Verified Results" tab with a "Released" badge; entered results appear under "Results Entry" with "Awaiting Verify"; submitting a result succeeds and the success message mentions released) and re-run until green.

- [ ] **Step 2: Lint the changed lab files**

Run: `npx eslint "app/(app)/lab" "__tests__/lab-page.test.tsx"`
Expected: no errors. Fix any lint errors (unused imports, hooks rules) and re-run.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/lab/page.tsx" "app/(app)/lab/request/page.tsx" "app/(app)/lab/layout.tsx" "__tests__/lab-page.test.tsx"
git commit -m "feat(lab): rework lab page for entered/verified/released result workflow"
```

---

### Task 2: Finalize & commit Topbar notifications

The Topbar already has in-flight notification-bell work plus its test, and the `useNotifications` hook gained polling + `markAllRead`. Verify, fix if needed, and commit.

**Files:**
- Modify: `components/layout/Topbar.tsx` (already modified)
- Modify: `hooks/useAdmissions.ts` (already modified — notification additions only)
- Modify: `lib/admissions.ts` (already modified)
- Modify: `package.json`, `package-lock.json` (already modified — date-fns, laravel-echo, pusher-js)
- Test: `__tests__/topbar-notifications.test.tsx` (already created)

**Interfaces:**
- Consumes: `useNotifications(admissionId?: number, options?: { interval?: number })` returning `{ notifications, loading, error, refetch, markRead, markAllRead }` and `admissionsApi.markAllNotificationsRead()`.
- Produces: nothing for later tasks.

- [ ] **Step 1: Run the Topbar notifications test**

Run: `npm test -- __tests__/topbar-notifications.test.tsx`
Expected: 5 tests PASS (dropdown renders API notifications; empty state; mark read via API; mark all read via API; clear-all is local-only). Fix failures in `components/layout/Topbar.tsx` / `hooks/useAdmissions.ts` / `lib/admissions.ts` as needed and re-run.

- [ ] **Step 2: Lint the changed notification files**

Run: `npx eslint "components/layout/Topbar.tsx" "hooks/useAdmissions.ts" "lib/admissions.ts" "__tests__/topbar-notifications.test.tsx"`
Expected: no errors. Fix and re-run.

- [ ] **Step 3: Commit**

```bash
git add "components/layout/Topbar.tsx" "hooks/useAdmissions.ts" "lib/admissions.ts" "package.json" "package-lock.json" "__tests__/topbar-notifications.test.tsx"
git commit -m "feat(notifications): add Topbar notification bell with read/clear actions"
```

---

### Task 3: Shared lab types + `useLabResults` hook (TDD)

**Files:**
- Create: `types/lab.ts`
- Create: `hooks/useLabResults.ts`
- Test: `__tests__/use-lab-results.test.tsx`

**Interfaces:**
- Consumes: `api.get(endpoint, token)` from `@/lib/api`.
- Produces:
  - `types/lab.ts`:
    ```ts
    export interface LabResult {
      id: number;
      lab_request_id: number;
      result_value_numeric: number | null;
      result_value_text: string | null;
      unit: string | null;
      reference_range: string | null;
      is_abnormal: boolean;
      is_critical: boolean;
      status: string;
      released_at: string | null;
      released_by: number | null;
      lab_request?: { id: number; test_name: string; loinc_code: string | null; status: string };
      releasedBy?: { id: number; name: string };
    }

    export interface LabOrder {
      id: number;
      order_type: string;
      status: string;
    }
    ```
  - `hooks/useLabResults.ts`:
    ```ts
    export function useLabResults(
      encounterId: number | null,
      token: string | null,
      enabled: boolean
    ): { results: LabResult[]; loading: boolean; error: string | null; refetch: () => void }
    ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/use-lab-results.test.tsx`:

```tsx
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLabResults } from "../hooks/useLabResults";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/api", () => ({ api: { get: mocks.get } }));

describe("useLabResults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue({ data: { data: [] } });
  });

  it("does not fetch while disabled", () => {
    renderHook(() => useLabResults(2, "token", false));
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("fetches the encounter lab-results endpoint when enabled", async () => {
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/encounters/2/lab-results", "token"));
    expect(result.current.results).toEqual([]);
  });

  it("normalizes the { data } envelope", async () => {
    mocks.get.mockResolvedValue({ data: { data: [{ id: 1 }] } });
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(result.current.results).toEqual([{ id: 1 }]));
  });

  it("exposes refetch that re-calls the API", async () => {
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1));
    result.current.refetch();
    await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  });

  it("sets error when the request fails", async () => {
    mocks.get.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useLabResults(2, "token", true));
    await waitFor(() => expect(result.current.error).toBe("boom"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/use-lab-results.test.tsx`
Expected: FAIL — cannot find module `../hooks/useLabResults`.

- [ ] **Step 3: Write the types and the hook**

Create `types/lab.ts` with exactly the interfaces in the Produces block above.

Create `hooks/useLabResults.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { LabResult } from "@/types/lab";

export function useLabResults(
  encounterId: number | null,
  token: string | null,
  enabled: boolean
) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!encounterId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/encounters/${encounterId}/lab-results`, token);
      const data = res?.data?.data ?? res?.data ?? [];
      setResults(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lab results");
    } finally {
      setLoading(false);
    }
  }, [encounterId, token]);

  useEffect(() => {
    if (enabled) void fetchData();
  }, [enabled, fetchData]);

  return { results, loading, error, refetch: fetchData };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/use-lab-results.test.tsx`
Expected: 5 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "hooks/useLabResults.ts" "types/lab.ts" "__tests__/use-lab-results.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "types/lab.ts" "hooks/useLabResults.ts" "__tests__/use-lab-results.test.tsx"
git commit -m "feat(lab): add useLabResults hook for encounter lab results"
```

---

### Task 4: `LabResultsPanel` component (TDD)

**Files:**
- Create: `components/consultation/LabResultsPanel.tsx`
- Test: `__tests__/lab-results-panel.test.tsx`

**Interfaces:**
- Consumes:
  - `useLabResults(encounterId, token, enabled)` → `{ results, loading, error, refetch }` from Task 3.
  - `LabResult` from `@/types/lab`.
  - `Badge` (variants `secondary`, `destructive`), `Button` (`nativeButton={false}` prop), `Card/CardHeader/CardTitle/CardContent`, `Skeleton`, `EmptyState`, `formatDistanceToNow` from `date-fns`.
- Produces:
  ```ts
  export default function LabResultsPanel(props: {
    encounterId: number | null;
    token: string | null;
    pendingCount: number;
  }): JSX.Element
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/lab-results-panel.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LabResultsPanel from "../components/consultation/LabResultsPanel";

const mocks = vi.hoisted(() => ({
  results: [] as unknown[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
}));

vi.mock("@/hooks/useLabResults", () => ({
  useLabResults: () => ({
    results: mocks.results,
    loading: mocks.loading,
    error: mocks.error,
    refetch: mocks.refetch,
  }),
}));

const base = {
  id: 1,
  lab_request_id: 5,
  result_value_numeric: 13.5,
  result_value_text: null,
  unit: "g/dL",
  reference_range: "12-16",
  is_abnormal: false,
  is_critical: false,
  status: "released",
  released_at: "2026-08-06T08:38:21.000000Z",
  released_by: 3,
  lab_request: { id: 5, test_name: "CBC", loinc_code: "CBC001", status: "Completed" },
  releasedBy: { id: 3, name: "Dr. Owen Banda" },
};

describe("LabResultsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.results = [];
    mocks.loading = false;
    mocks.error = null;
  });

  it("renders released results with value, unit, reference range, and released meta", () => {
    mocks.results = [base];
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText("CBC")).toBeInTheDocument();
    expect(screen.getByText("13.5 g/dL")).toBeInTheDocument();
    expect(screen.getByText("(12-16)")).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Owen Banda/)).toBeInTheDocument();
  });

  it("shows the pending count line when pendingCount > 0", () => {
    mocks.results = [base];
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={2} />);
    expect(screen.getByText(/2 tests still in progress/)).toBeInTheDocument();
  });

  it("shows an empty state when there are no results", () => {
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText(/No results released yet/)).toBeInTheDocument();
  });

  it("shows Abnormal and Critical badges", () => {
    mocks.results = [
      { ...base, id: 2, result_value_numeric: 18.2, is_abnormal: true, lab_request: { ...base.lab_request, test_name: "Glucose" } },
      { ...base, id: 3, result_value_numeric: 0.8, is_abnormal: true, is_critical: true, lab_request: { ...base.lab_request, test_name: "Sodium" } },
    ];
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText("Abnormal")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
  });

  it("refresh button triggers refetch", () => {
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("disables the refresh button while loading", () => {
    mocks.loading = true;
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByRole("button", { name: /Refresh/ })).toBeDisabled();
  });

  it("shows the error message with a retry button", () => {
    mocks.error = "Failed to load lab results";
    render(<LabResultsPanel encounterId={2} token="t" pendingCount={0} />);
    expect(screen.getByText("Failed to load lab results")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(mocks.refetch).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lab-results-panel.test.tsx`
Expected: FAIL — cannot find module `../components/consultation/LabResultsPanel`.

- [ ] **Step 3: Write the component**

Create `components/consultation/LabResultsPanel.tsx`:

```tsx
"use client";

import { FlaskConical, RefreshCw, TriangleAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { useLabResults } from "@/hooks/useLabResults";
import type { LabResult } from "@/types/lab";

interface LabResultsPanelProps {
  encounterId: number | null;
  token: string | null;
  pendingCount: number;
}

function ResultRow({ result }: { result: LabResult }) {
  const value =
    result.result_value_numeric != null
      ? String(result.result_value_numeric)
      : result.result_value_text ?? "-";

  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{result.lab_request?.test_name ?? "Lab result"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {result.released_at
            ? `Released ${formatDistanceToNow(new Date(result.released_at))} ago${result.releasedBy?.name ? ` · by ${result.releasedBy.name}` : ""}`
            : "Released"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {result.reference_range && (
          <span className="text-xs text-muted-foreground font-mono">({result.reference_range})</span>
        )}
        <span
          className={cn(
            "font-mono text-sm font-bold",
            result.is_critical && "text-red-600",
            result.is_abnormal && !result.is_critical && "text-amber-600"
          )}
        >
          {value}{result.unit ? ` ${result.unit}` : ""}
        </span>
        {result.is_critical && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
        {result.is_abnormal && !result.is_critical && <Badge variant="secondary" className="text-[10px] text-amber-700">Abnormal</Badge>}
      </div>
    </div>
  );
}

export default function LabResultsPanel({ encounterId, token, pendingCount }: LabResultsPanelProps) {
  const { results, loading, error, refetch } = useLabResults(encounterId, token, encounterId !== null);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            <FlaskConical className="h-4 w-4" /> Laboratory Results
          </CardTitle>
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} test{pendingCount === 1 ? "" : "s"} still in progress
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" nativeButton={false} onClick={refetch} disabled={loading || !encounterId}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200 flex items-center gap-2">
            <TriangleAlert className="h-4 w-4" /> {error}
          </div>
        )}
        {loading && results.length === 0 ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            title="No results released yet"
            description="Released results will appear here once the lab completes them."
          />
        ) : (
          <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
            {results.map((r) => <ResultRow key={r.id} result={r} />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lab-results-panel.test.tsx`
Expected: 7 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "components/consultation/LabResultsPanel.tsx" "__tests__/lab-results-panel.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "components/consultation/LabResultsPanel.tsx" "__tests__/lab-results-panel.test.tsx"
git commit -m "feat(consultation): add lab results panel with abnormal/critical highlighting"
```

---

### Task 5: Integrate the Results tab into the consultation page

**Files:**
- Modify: `app/(app)/patients/[id]/consultation/page.tsx`

**Interfaces:**
- Consumes: `LabResultsPanel` from Task 4 (props `{ encounterId, token, pendingCount }`).
- Produces: the "Results" sub-tab in the SOAP workbench.

- [ ] **Step 1: Add the sub-tab type and entry**

In `app/(app)/patients/[id]/consultation/page.tsx`:

1. Change the `SubTab` union (top of file) from:
   ```ts
   type SubTab = "subjective" | "objective" | "assessment" | "plan" | "orders" | "prescriptions" | "timeline" | "billing";
   ```
   to:
   ```ts
   type SubTab = "subjective" | "objective" | "assessment" | "plan" | "orders" | "results" | "prescriptions" | "timeline" | "billing";
   ```

2. In the `subTabs` array, insert between the `orders` and `prescriptions` entries:
   ```ts
   { key: "results", label: "Results", icon: <FlaskConical className="h-4 w-4" /> },
   ```

3. Add the import alongside the existing lucide imports and component imports:
   ```ts
   import LabResultsPanel from "@/components/consultation/LabResultsPanel";
   ```
   (place with the other `@/components/...` imports near the top of the file)

- [ ] **Step 2: Derive the pending lab count**

Near where `const activeEncounterId = summary?.encounter?.id;` is defined, add:

```ts
const pendingLabCount = orders.filter(
  (o) =>
    o.order_type?.toLowerCase() === "lab" &&
    !["completed", "cancelled"].includes(o.status?.toLowerCase() ?? "")
).length;
```

- [ ] **Step 3: Render the panel when the tab is active**

Immediately after the closing of the `{activeSubTab === "orders" && (...)}` block (before the `{activeSubTab === "prescriptions" && (...)}` block), add:

```tsx
{activeSubTab === "results" && (
  <LabResultsPanel
    encounterId={activeEncounterId}
    token={token}
    pendingCount={pendingLabCount}
  />
)}
```

- [ ] **Step 4: Typecheck + build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: all tests pass (existing lab-page, topbar-notifications, use-lab-results, lab-results-panel, and any pre-existing tests).

- [ ] **Step 6: Lint the modified page**

Run: `npx eslint "app/(app)/patients/[id]/consultation/page.tsx"`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "app/(app)/patients/[id]/consultation/page.tsx"
git commit -m "feat(consultation): show released lab results in the Results sub-tab"
```

---

### Task 6: Cleanup commit + full verification

**Files:**
- Modify: `app/(app)/nurse-station/page.tsx`, `app/(app)/triage-queue/page.tsx`, `app/(app)/patients/[id]/emergency-triage/page.tsx` (already modified — queue encounter filter + emergency-triage error guard)

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Lint the cleanup files**

Run: `npx eslint "app/(app)/nurse-station/page.tsx" "app/(app)/triage-queue/page.tsx" "app/(app)/patients/[id]/emergency-triage/page.tsx"`
Expected: no errors.

- [ ] **Step 2: Commit cleanup**

```bash
git add "app/(app)/nurse-station/page.tsx" "app/(app)/triage-queue/page.tsx" "app/(app)/patients/[id]/emergency-triage/page.tsx"
git commit -m "fix(queues): filter checked-in appointments by encounter status; guard empty validation errors"
```

- [ ] **Step 3: Full verification**

Run: `npm test`
Expected: all tests pass.

Run: `npm run lint`
Expected: no errors across the project.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 4: Confirm working tree is clean**

Run: `git status --short`
Expected: no modified or untracked files remain (any leftover untracked files are pre-existing scratch files; leave them).

---

## Plan Self-Review

- **Spec coverage:** Scope items 1-3 (Results tab, in-flight finalization, cleanup commit) map to Tasks 4+5, Tasks 1+2, and Task 6. Data contract, color-coding, pending count, error handling, empty/loading states, and test file are all covered.
- **Placeholder scan:** No TBD/TODO; every code step has concrete code.
- **Type consistency:** `useLabResults` signature and `LabResult` fields used in Task 4 match Task 3 exactly; `LabResultsPanel` props used in Task 5 match Task 4.
