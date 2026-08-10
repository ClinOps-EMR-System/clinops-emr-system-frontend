# LOINC in Consultation Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire LOINC into the consultation "Orders" tab so lab orders are placed with a real LOINC code. The free-text "Test Name" field is replaced with an in-page LOINC search picker (mirrors the existing drug-search pattern). Backend validation is tightened so `POST /encounters/{encounter}/orders` rejects lab orders without a valid `loinc_code`. Also fix `adminApi.searchLoinc`, which never unwraps the API envelope, so the same LOINC search works in the Admin Service Catalog.

**Architecture:** Three independent tasks across two repos.

- Task 1 (backend repo `ClinOps-EMR-System-backend`): tighten `StoreOrderRequest` rules with `required_if:order_type,Lab,lab` + `exists:loinc_codes,code`; add a Pest validation test; update the 4 existing `OrderTest` lab-order posts that now 422; sync `docs/openapi.yaml`.
- Task 2 (frontend repo `clinops-emr-system-frontend`): extend the `LoincCode` type to match the LoincCodeResource payload (id, long_common_name, short_name, order_obs, status, units) + add `LoincCodeUnit`; make `adminApi.searchLoinc` unwrap the envelope; add a unit test proving the unwrap.
- Task 3 (frontend repo): replace the Test Name input on the Orders tab with a LOINC search picker (search ≥2 chars → `/loinc/search` → dropdown → selected chip), and require selection to submit; add a component test.

**Tech Stack:**

- Backend: Laravel 13 / PHP 8.3, Pest, SQLite in-memory tests.
- Frontend: Next.js 16 (app router), React 19, TypeScript 5, Tailwind v4, shadcn/base-ui components, Vitest 4 + Testing Library.

**Design spec:** `docs/superpowers/specs/2026-08-10-loinc-consultation-orders-design.md` (committed, a8a71db / 529631d).

---

## Global Constraints

Backend (see backend `AGENTS.md`):
- Run `composer test` (Pest) before considering a task complete. Per-task filters: `php artisan test --filter=<TestClass>`.
- Controllers stay thin; business logic in services. Changes here only touch a Form Request + tests + OpenAPI.
- Any new/removed/updated endpoint, or changed request validation, must be reflected in `docs/openapi.yaml`. This change alters the request contract of `POST /encounters/{encounter}/orders`, so `docs/openapi.yaml` MUST be updated.
- Follow the existing test conventions: `RefreshDatabase`, `Artisan::call('db:seed', ['--class' => RolePermissionSeeder::class, '--force' => true])` in `beforeEach`, `Sanctum::actingAs($user)`, model factories. Seed `LoincCodesTableSeeder` (idempotent `updateOrCreate`) wherever a valid code is needed. The seeder ships real codes, e.g. `70569-9`.
- Tests hit the `/api` prefix (existing OrderTest posts to `/api/encounters/.../orders`).

Frontend (see existing plan `2026-08-06-lab-results-in-consultation-frontend.md`):
- Read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code (the installed version has breaking changes vs public docs).
- API responses use the Laravel envelope `{ status, message, data }`. Normalize with `res.data.data || res.data` / the page's existing `Array.isArray(res.data) ? res.data : res.data.data || []` pattern.
- Tests must mock `@/lib/api` and (when used) `@/store/RoleContext`, `@/store/RealtimeContext`, `@/store/LabResultBus`, `next/navigation` using `vi.hoisted` + `vi.mock`, matching the style in `__tests__/lab-request.test.tsx`.
- Verify before each commit: `npm test`, `npx eslint <changed-files>`, `npx tsc --noEmit`. On Windows/PowerShell — use the exact commands given; `git add` ONLY the files listed in each task.
- Do not add code comments.

---

## Task 1: Backend — require a valid LOINC code on lab orders

**Repo:** `C:\Users\vamp2o5\Documents\Projects\ClinOps\ClinOps-EMR-System-backend` (worktree per using-git-worktrees)

**Files:**
- Modify: `app/Http/Requests/StoreOrderRequest.php` (rule at line 25)
- Create: `tests/Feature/StoreOrderValidationTest.php`
- Modify: `tests/Feature/OrderTest.php` (4 lab-order posts)
- Modify: `docs/openapi.yaml` (`POST /encounters/{encounter}/orders` request body)

**Current rule (line 25):** `'loinc_code' => ['nullable', 'string'],`

**New rule:** `'loinc_code' => ['required_if:order_type,Lab,lab', 'nullable', 'string', 'exists:loinc_codes,code'],`

Rationale: `required_if` is implicit (fires when the field is absent/empty for lab orders → 422). `exists` is non-implicit, so for non-lab orders with an empty `loinc_code` it is skipped. Non-lab orders keep working without a code.

- [ ] **Step 1: RED — write `tests/Feature/StoreOrderValidationTest.php`**

Create the file with the following shape (follow `OrderTest.php` conventions exactly):

```php
<?php

use App\Models\Encounter;
use App\Models\Patient;
use App\Models\User;
use Database\Seeders\LoincCodesTableSeeder;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    Artisan::call('db:seed', ['--class' => RolePermissionSeeder::class, '--force' => true]);
    Artisan::call('db:seed', ['--class' => LoincCodesTableSeeder::class, '--force' => true]);

    $this->user = User::factory()->create();
    $this->user->assignRole('Admin');
    $this->patient = Patient::factory()->create();
    $this->encounter = Encounter::factory()->create([
        'patient_id' => $this->patient->id,
        'status' => 'in_consultation',
    ]);
    Sanctum::actingAs($this->user);
});

it('rejects a lab order without a loinc_code', function () {
    $this->postJson("/api/encounters/{$this->encounter->id}/orders", [
        'order_type' => 'lab',
        'test_name' => 'Malaria smear',
        'clinical_indication' => 'Suspected malaria',
        'priority' => 'urgent',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['loinc_code']);
});

it('rejects a lab order with an unknown loinc_code', function () {
    $this->postJson("/api/encounters/{$this->encounter->id}/orders", [
        'order_type' => 'lab',
        'test_name' => 'Malaria smear',
        'loinc_code' => 'NOT-A-REAL-CODE',
    ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['loinc_code']);
});

it('accepts a lab order with a valid loinc_code', function () {
    $this->postJson("/api/encounters/{$this->encounter->id}/orders", [
        'order_type' => 'lab',
        'test_name' => 'Hemoglobin A1c [Mass/volume] in Blood',
        'loinc_code' => '70569-9',
        'clinical_indication' => 'Diabetes follow-up',
        'priority' => 'routine',
    ])
        ->assertStatus(201)
        ->assertJsonPath('data.status', 'ordered')
        ->assertJsonPath('data.lab_request.loinc_code', '70569-9');
});

it('accepts a non-lab order without a loinc_code', function () {
    $this->postJson("/api/encounters/{$this->encounter->id}/orders", [
        'order_type' => 'imaging',
        'clinical_indication' => 'Chest pain',
        'priority' => 'routine',
    ])
        ->assertStatus(201)
        ->assertJsonPath('data.order_type', 'imaging');
});
```

Run: `php artisan test --filter=StoreOrderValidationTest`
Expected: the two rejection tests FAIL (they currently get 201 since the rule is `nullable`). The acceptance tests should already pass because `OrderService` resolves and stores `loinc_code` on the lab request — if `assertJsonPath('data.lab_request.loinc_code', ...)` doesn't match the actual response shape, inspect the LabRequest resource/JSON (it should expose `loinc_code`) and assert whatever field shape it actually returns.

- [ ] **Step 2: GREEN — tighten `StoreOrderRequest`**

In `app/Http/Requests/StoreOrderRequest.php` change line 25 to:

```php
'loinc_code' => ['required_if:order_type,Lab,lab', 'nullable', 'string', 'exists:loinc_codes,code'],
```

Run: `php artisan test --filter=StoreOrderValidationTest`
Expected: 4 PASS.

- [ ] **Step 3: Update the 4 broken lab-order posts in `OrderTest.php`**

The tightened rule 422s the following existing tests because they post a lab order with no `loinc_code`. Add `'loinc_code' => '70569-9',` to each post, and add the `LoincCodesTableSeeder` to the shared `beforeEach` (line ~15, next to the RolePermissionSeeder `Artisan::call`):

- `it('creates a lab order', ...)` — post at lines 44-50
- `it('creates a linked lab request when order_type is capitalized', ...)` — post at lines 67-73
- `it('denies order access without permission', ...)` — post at lines 98-101. IMPORTANT: without a valid code this now 422s before the policy check; adding the code keeps it exercising the 403 policy path.
- `it('notifies lab technicians when a lab order is created', ...)` — post at lines 110-114

Do NOT touch the imaging-order test (line 84) — it must keep passing without a code.

Run: `php artisan test --filter=OrderTest`
Expected: all PASS.

- [ ] **Step 4: Sync `docs/openapi.yaml`**

Find `POST /encounters/{encounter}/orders`. In the request body schema, mark `loinc_code` as required when `order_type` is `Lab`/`lab` and document the `exists:loinc_codes,code` validation (mirror how `test_name`'s conditional requirement is already expressed). Verify the schema still renders / validates (no script available, just keep it consistent with existing entries).

- [ ] **Step 5: Full backend suite**

Run: `composer test`
Expected: full suite green (existing 636 tests + 4 new = 640).

- [ ] **Step 6: Commit**

```bash
git add app/Http/Requests/StoreOrderRequest.php tests/Feature/StoreOrderValidationTest.php tests/Feature/OrderTest.php docs/openapi.yaml
git commit -m "feat(orders): require valid loinc_code on lab orders"
```

---

## Task 2: Frontend — extend `LoincCode` type and unwrap `adminApi.searchLoinc`

**Repo:** `C:\Users\vamp2o5\Documents\Projects\ClinOps\clinops-emr-system-frontend` (worktree per using-git-worktrees)

**Files:**
- Modify: `types/admin.ts` (lines 84-89)
- Modify: `lib/services/admin/index.ts` (lines 312-313)
- Create: `__tests__/admin-search-loinc.test.ts`

**Current code:**

```ts
export interface LoincCode {
  code: string;
  display_name: string;
  component_name?: string | null;
  system?: string | null;
}
```

```ts
searchLoinc: async (token: string | null, q: string) =>
  (await api.get(`/loinc/search?q=${encodeURIComponent(q)}`, token)) as LoincCode[],
```

**New `LoincCode`/`LoincCodeUnit` (must match LoincCodeResource from the backend):**

```ts
export interface LoincCodeUnit {
  unit_id: number;
  unit_name: string;
  primary: boolean;
}

export interface LoincCode {
  id: number;
  code: string;
  display_name: string;
  component_name?: string | null;
  long_common_name?: string | null;
  short_name?: string | null;
  system?: string | null;
  order_obs?: string | null;
  status?: string | null;
  units?: LoincCodeUnit[];
}
```

**New `searchLoinc` (unwrap is already imported and used throughout the file):**

```ts
searchLoinc: async (token: string | null, q: string) =>
  unwrap<LoincCode[]>(await api.get(`/loinc/search?q=${encodeURIComponent(q)}`, token)),
```

- [ ] **Step 1: RED — write `__tests__/admin-search-loinc.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get },
}));

import { adminApi } from "@/lib/services/admin";

describe("adminApi.searchLoinc", () => {
  beforeEach(() => vi.clearAllMocks());

  it("unwraps the envelope and returns the LOINC array", async () => {
    const loinc = {
      id: 1,
      code: "882-1",
      display_name: "Hemoglobin [Mass/volume] in Blood",
      component_name: "Hemoglobin",
      system: "Bld",
      order_obs: "Both",
      status: "ACTIVE",
      units: [{ unit_id: 1, unit_name: "g/dL", primary: true }],
    };
    mocks.get.mockResolvedValue({ status: 200, message: "success", data: [loinc] });

    const result = await adminApi.searchLoinc("tok", "hemo");

    expect(mocks.get).toHaveBeenCalledWith("/loinc/search?q=hemo", "tok");
    expect(result).toEqual([loinc]);
  });
});
```

Run: `npm test -- __tests__/admin-search-loinc.test.ts`
Expected: 1 FAILURE (current code returns the whole envelope `{status, message, data}` object, not the array).

- [ ] **Step 2: GREEN — apply the type + unwrap changes above**

Run: `npm test -- __tests__/admin-search-loinc.test.ts`
Expected: 1 PASS.

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npx eslint "types/admin.ts" "lib/services/admin/index.ts" "__tests__/admin-search-loinc.test.ts"`
Expected: all green / no errors.

- [ ] **Step 4: Commit**

```bash
git add types/admin.ts lib/services/admin/index.ts __tests__/admin-search-loinc.test.ts
git commit -m "feat(admin): extend LoincCode type and unwrap LOINC search"
```

---

## Task 3: Frontend — LOINC search picker on the consultation Orders tab

**Repo:** `C:\Users\vamp2o5\Documents\Projects\ClinOps\clinops-emr-system-frontend` (same worktree as Task 2)

**Files:**
- Modify: `app/(app)/patients/[id]/consultation/page.tsx`
- Create: `__tests__/consultation-loinc-order.test.tsx`

### 3.1 — Changes to `page.tsx`

**Import:** add `import type { LoincCode } from "@/types/admin";` (after line 13's `LabResult` import). `Search`, `X`, `Loader2` icons are already imported.

**State:** after line 252 (`orderForm`), change `orderForm` and add LOINC state:

```ts
const [orderForm, setOrderForm] = useState({ clinical_indication: "", priority: "routine" });
const [loincQuery, setLoincQuery] = useState("");
const [loincResults, setLoincResults] = useState<LoincCode[]>([]);
const [loincLoading, setLoincLoading] = useState(false);
const [selectedLoinc, setSelectedLoinc] = useState<LoincCode | null>(null);
```

**Debounced search effect** (mirror the `drugQuery` effect at lines ~440-451; use the same envelope unwrap pattern as line 344):

```ts
useEffect(() => {
  const delayDebounceFn = setTimeout(async () => {
    if (loincQuery.trim().length < 2 || selectedLoinc) {
      setLoincResults([]);
      return;
    }
    try {
      setLoincLoading(true);
      const response = await api.get(`/loinc/search?q=${encodeURIComponent(loincQuery.trim())}`, token);
      const payload = response?.data ?? response;
      setLoincResults(Array.isArray(payload) ? payload : payload?.data ?? []);
    } catch {
      setLoincResults([]);
    } finally {
      setLoincLoading(false);
    }
  }, 300);
  return () => clearTimeout(delayDebounceFn);
}, [loincQuery, selectedLoinc, token]);
```

**`handleCreateOrder`** (lines 588-609): require a selection, send `loinc_code`, and reset picker state:

```ts
const handleCreateOrder = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!summary?.encounter?.id || !selectedLoinc) return;
  setSubmitLoading(true);
  setError(null);
  try {
    await api.post(`/encounters/${summary.encounter.id}/orders`, {
      patient_id: parseInt(patientId),
      order_type: "lab",
      test_name: selectedLoinc.display_name,
      loinc_code: selectedLoinc.code,
      clinical_indication: orderForm.clinical_indication || null,
      priority: orderForm.priority,
    }, token);
    success("Order placed.");
    setSelectedLoinc(null);
    setLoincQuery("");
    setLoincResults([]);
    setOrderForm({ clinical_indication: "", priority: "routine" });
    fetchConsultationData();
  } catch (err) {
    setError(friendlyError(err, "place order"));
  } finally {
    setSubmitLoading(false);
  }
};
```

**JSX:** replace the entire "Test Name" block (lines 1459-1472, the `<div>` with `field-order-test-name`) with the LOINC picker, mirroring the drug picker (lines 1602-1654):

```tsx
<div className="relative">
  <label htmlFor="field-order-loinc" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
    LOINC Test <span className="text-destructive">*</span>
  </label>
  <input
    id="field-order-loinc"
    type="text"
    required
    className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    placeholder="Search LOINC test..."
    value={loincQuery}
    onChange={(e) => { setLoincQuery(e.target.value); setSelectedLoinc(null); }}
  />
  {loincResults.length > 0 && !selectedLoinc && (
    <ul className="absolute left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 divide-y text-sm">
      {loincResults.map((loinc) => (
        <li key={loinc.code}>
          <button
            type="button"
            onClick={() => { setSelectedLoinc(loinc); setLoincQuery(loinc.display_name); setLoincResults([]); }}
            className="w-full text-left px-4 py-2.5 hover:bg-muted/50 flex items-baseline justify-between transition-colors"
          >
            <span className="font-medium text-foreground">{loinc.display_name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-2">
              <span>{loinc.code}</span>
              {loinc.units?.find((u) => u.primary)?.unit_name ?? loinc.units?.[0]?.unit_name ?? ""}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )}
  {loincQuery.trim().length >= 2 && !loincLoading && loincResults.length === 0 && !selectedLoinc && (
    <p className="text-xs text-muted-foreground mt-1">No LOINC tests found.</p>
  )}
</div>
{selectedLoinc && (
  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center justify-between">
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Selected: </span>
      <span className="text-sm font-semibold text-emerald-950">{selectedLoinc.display_name}</span>
      <span className="ml-2 text-xs text-emerald-700">{selectedLoinc.code}</span>
      {selectedLoinc.units?.find((u) => u.primary) && (
        <span className="ml-2 text-xs text-emerald-700">{selectedLoinc.units.find((u) => u.primary)?.unit_name}</span>
      )}
    </div>
    <button type="button" onClick={() => { setSelectedLoinc(null); setLoincQuery(""); setLoincResults([]); }} className="text-xs text-muted-foreground hover:text-foreground font-bold uppercase">Clear</button>
  </div>
)}
```

**Submit button** (line 1501): `orderForm.test_name` no longer exists. Change `disabled` to:

```tsx
<Button type="submit" disabled={submitLoading || !selectedLoinc}>
```

- [ ] **Step 1: RED — write `__tests__/consultation-loinc-order.test.tsx`**

Follow the mock style of `__tests__/lab-request.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToastProvider } from "@/components/ui/Toast";
import ConsultationPage from "../app/(app)/patients/[id]/consultation/page";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, back: vi.fn() }),
  useParams: () => ({ id: "1" }),
}));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get, post: mocks.post },
}));

vi.mock("@/store/RoleContext", () => ({
  useAuth: () => ({ token: "test-token", user: { roles: ["Admin"], permissions: [] } }),
}));

vi.mock("@/store/RealtimeContext", () => ({
  useRealtime: () => ({ subscribe: vi.fn() }),
}));

vi.mock("@/store/LabResultBus", () => ({
  useLabResultBus: () => ({ openResult: vi.fn() }),
}));
```

`beforeEach` mock contract (adjust fixtures to whatever the page actually consumes — the page unwraps `res.data`):
- `/patients/1` → `{ data: { patient: { id: 1, full_name: "Test Patient" } } }`
- `/patients/1/triage` → `{ data: { encounter: { id: 2, status: "in_consultation", chief_complaint: null, history_of_present_illness: null, allergy_confirmed_at: null }, allergies_confirmed: true, allergies: [], pregnancy_status: false, current_medications: [], vital_signs: {} } }` — `summary.encounter.id` drives everything; without it the tabs never render.
- `/diagnoses` → `{ data: [] }`
- `/orders?patient_id=1&encounter_id=2` → `{ data: [] }`
- `/prescriptions?encounter_id=2` → `{ data: [] }`
- `/encounters/2/consultation` → `{ data: {} }`
- `/alerts?encounter_id=2` → `{ data: [] }`
- `/patients/1/vital-signs/trends?days=7` → `{ data: [] }`
- `/loinc/search?q=hemo` → `{ data: [{ id: 1, code: "882-1", display_name: "Hemoglobin [Mass/volume] in Blood", component_name: "Hemoglobin", system: "Bld", units: [{ unit_id: 1, unit_name: "g/dL", primary: true }] }] }`
- default (any other GET) → `{ data: [] }`

`mocks.post` → `{ status: 201, message: "Order placed.", data: { id: 99 } }`.

Tests:

```tsx
it("searches LOINC tests as the user types in the Orders tab", async () => {
  render(<ToastProvider><ConsultationPage /></ToastProvider>);

  fireEvent.click(screen.getByRole("button", { name: /^Orders/ }));

  const input = await screen.findByLabelText(/LOINC Test/i);
  fireEvent.change(input, { target: { value: "hemo" } });

  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/loinc/search?q=hemo", "test-token"));
  expect(await screen.findByText("Hemoglobin [Mass/volume] in Blood")).toBeInTheDocument();
});

it("places a lab order with the selected LOINC code", async () => {
  render(<ToastProvider><ConsultationPage /></ToastProvider>);

  fireEvent.click(screen.getByRole("button", { name: /^Orders/ }));

  const input = await screen.findByLabelText(/LOINC Test/i);
  fireEvent.change(input, { target: { value: "hemo" } });
  fireEvent.click(await screen.findByText("Hemoglobin [Mass/volume] in Blood"));

  fireEvent.click(screen.getByRole("button", { name: /Place Order/i }));

  await waitFor(() =>
    expect(mocks.post).toHaveBeenCalledWith(
      "/encounters/2/orders",
      expect.objectContaining({
        patient_id: 1,
        order_type: "lab",
        loinc_code: "882-1",
        test_name: "Hemoglobin [Mass/volume] in Blood",
        priority: "routine",
      }),
      "test-token",
    ),
  );
});
```

Notes for the implementer: the tab label may include a count (e.g. "Orders 0") so use a prefix regex; if the tab button isn't found by `^Orders`, inspect the tab bar markup around lines 855-870 and 1840-1850 and adjust the query. If mount-time GETs beyond the list above are discovered, mock them with `{ data: [] }`.

Run: `npm test -- __tests__/consultation-loinc-order.test.tsx`
Expected: 2 FAILURES against the current page (no LOINC field / no POST with loinc_code).

- [ ] **Step 2: GREEN — apply the `page.tsx` changes from section 3.1**

Run: `npm test -- __tests__/consultation-loinc-order.test.tsx`
Expected: 2 PASS. If the picker or submission misbehaves, debug against the mock contract above.

- [ ] **Step 3: Verify no regressions**

Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npx eslint "app/(app)/patients/[id]/consultation/page.tsx" "__tests__/consultation-loinc-order.test.tsx"`
Expected: all green / no errors.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/patients/[id]/consultation/page.tsx" "__tests__/consultation-loinc-order.test.tsx"
git commit -m "feat(consultation): LOINC search picker for lab orders"
```

---

## Verification & Rollout

After all three tasks are committed on their worktree branches:

- Backend: full `composer test` green.
- Frontend: `npm test`, `npx tsc --noEmit`, `npx eslint` on changed files all green.
- Follow superpowers:finishing-a-development-branch to merge the backend branch to main and the frontend branch to main, then delete worktree branches.
- Manual smoke check: in the consultation Orders tab, type ≥2 chars → pick a LOINC test → Place Order → order history shows the test with its LOINC code; Admin → Service Catalog LOINC search now lists results.

## Non-Goals (deferred, unchanged from the design spec)

- Free-text test-name fallback for lab orders.
- Filtering the picker by `order_obs = "Order"` (show all active LOINC tests).
- Frontend pre-flight validation display (backend 422 surfaces via `friendlyError`).
- Multi-select / batching LOINC panels.
