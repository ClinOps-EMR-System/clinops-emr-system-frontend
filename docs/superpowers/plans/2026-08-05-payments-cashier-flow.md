# Payments Cashier Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/payments` prototype page into a working cashier flow (patient search → bill picker → bill preview → payment form with direct + PayChangu methods → printable receipt), backed by a new `GET /bills/{bill}/receipt` endpoint.

**Architecture:** Add one read-only backend endpoint that returns a print snapshot (bill, patient, items, payments, cashier). Rebuild the frontend page with small focused components (`components/payments/`), a shared `usePayChanguCharge` hook for the PayChangu flow, and the app's shadcn-style UI components.

**Tech Stack:** Laravel 13 / PHP 8.3 backend (Pest tests, ApiResponse trait, Gate permissions, OpenAPI at `docs/openapi.yaml`). Next.js 16 / React 19 frontend (TypeScript, Tailwind, shadcn-style `components/ui`, `@/lib/api` helper, vitest + @testing-library/react).

**Repos:** Tasks 1 runs in `ClinOps-EMR-System-backend`; Tasks 2–6 run in `clinops-emr-system-frontend`. Branch `billing` in both.

## Global Constraints

- Backend: PSR-12; thin controllers (authorize → service → `$this->success()`); business logic in `app/Services`; authorization via `Gate::authorize('billing.view')` for the new read endpoint; every new endpoint has Pest tests (success / 401 / 403 / 404); update `docs/openapi.yaml`; run `composer test` before each commit.
- Frontend: this is a modified Next.js (read `node_modules/next/dist/docs/` for any Next API used); all API calls go through `@/lib/api` with the `useAuth()` token; currency rendered as `MK`; new schemas in `docs/openapi.yaml` (when touched) go under `components.schemas:` (pre-existing mis-nesting of older schemas is out of scope).
- Payment methods MUST use the canonical backend values exactly: `Cash`, `Bank Transfer`, `Mobile Money`, `Insurance`, `Card` (matches `RecordPaymentRequest` `in:` rule). The Billing page's lowercase values are a pre-existing bug — do not copy that pattern.
- Frontend verification: `npx tsc --noEmit` and `npx eslint <changed files>` (repo has pre-existing lint errors in unrelated files — do not fix them). Run existing vitest tests; keep them passing.
- Commits are small and frequent, one per task.

---

### Task 1: Backend — `GET /bills/{bill}/receipt` endpoint

**Repo:** `C:/Users/vamp2o5/Documents/Projects/ClinOps/ClinOps-EMR-System-backend`

**Files:**
- Test: `tests/Feature/BillingReceiptTest.php` (new)
- Modify: `app/Services/BillingService.php` (add `receipt()`)
- Modify: `app/Http/Controllers/BillingController.php` (add `receipt()`)
- Modify: `routes/api.php` (add route after the `/bills/{bill}/pay/{charge}/status` line)
- Modify: `docs/openapi.yaml` (add path + `Receipt` schema under `components.schemas`)

**Interfaces:**
- Consumes: `Bill` model (relations `patient`, `items`, `payments.receivedBy`), `ApiResponse` trait, `Gate`, existing billing route group (auth `billing.view`).
- Produces: `BillingService::receipt(Bill $bill): array` and `BillingController::receipt(Bill $bill): JsonResponse`. Response `data` shape (exact):
  ```
  {
    bill_id, bill_number, created_at (ISO8601), payment_status,
    total_amount, paid_amount, balance (all floats),
    patient: { id, hospital_number, first_name, last_name } | null,
    items: [ { id, item_name, quantity, unit_price, total } ],
    payments: [ { id, payment_number, amount_paid, payment_method, payment_reference,
                 received_by: { id, name } | null, created_at, status,
                 paychangu_charge_id, paychangu_trans_id } ],
    issued_by: { id, name } | null   // receivedBy of the most recent payment
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/BillingReceiptTest.php`:

```php
<?php

use App\Models\Bill;
use App\Models\BillItem;
use App\Models\Patient;
use App\Models\Payment;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

beforeEach(function () {
    Artisan::call('db:seed', ['--class' => RolePermissionSeeder::class, '--force' => true]);
    $this->admin = User::factory()->create();
    $this->admin->assignRole('Admin');
    $this->token = $this->admin->createToken('api-token')->plainTextToken;
    $this->patient = Patient::factory()->create();
    $this->bill = Bill::factory()->create([
        'patient_id' => $this->patient->id,
        'bill_number' => 'BLL-1001',
        'total_amount' => 10000,
        'paid_amount' => 4000,
        'balance' => 6000,
        'payment_status' => 'Partially Paid',
    ]);
    BillItem::factory()->create([
        'bill_id' => $this->bill->id,
        'item_name' => 'Consultation',
        'quantity' => 1,
        'unit_price' => 10000,
        'total' => 10000,
    ]);
    $this->payment = Payment::factory()->create([
        'bill_id' => $this->bill->id,
        'payment_number' => 'PAY-ABC123',
        'amount_paid' => 4000,
        'payment_method' => 'Cash',
        'received_by' => $this->admin->id,
    ]);
});

it('returns a receipt snapshot for a bill', function () {
    $this->withToken($this->token)
        ->getJson("/api/bills/{$this->bill->id}/receipt")
        ->assertStatus(200)
        ->assertJsonPath('data.bill_number', 'BLL-1001')
        ->assertJsonPath('data.total_amount', 10000)
        ->assertJsonPath('data.balance', 6000)
        ->assertJsonPath('data.patient.id', $this->patient->id)
        ->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.item_name', 'Consultation')
        ->assertJsonCount(1, 'data.payments')
        ->assertJsonPath('data.payments.0.payment_number', 'PAY-ABC123')
        ->assertJsonPath('data.payments.0.received_by.id', $this->admin->id)
        ->assertJsonPath('data.issued_by.id', $this->admin->id);
});

it('returns 404 for an unknown bill', function () {
    $this->withToken($this->token)
        ->getJson('/api/bills/999999/receipt')
        ->assertStatus(404);
});

it('returns 401 when unauthenticated', function () {
    $this->getJson("/api/bills/{$this->bill->id}/receipt")
        ->assertStatus(401);
});

it('returns 403 for a user without billing.view', function () {
    $user = User::factory()->create(); // no role, no permissions
    $token = $user->createToken('api-token')->plainTextToken;

    $this->withToken($token)
        ->getJson("/api/bills/{$this->bill->id}/receipt")
        ->assertStatus(403);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=BillingReceiptTest`
Expected: route not found / method missing → tests fail (404 or "Controller method not found").

- [ ] **Step 3: Implement the service method**

Add to `app/Services/BillingService.php` (after `getPatientBalance`):

```php
public function receipt(Bill $bill): array
{
    $bill->load([
        'patient:id,hospital_number,first_name,last_name',
        'items:id,bill_id,item_name,quantity,unit_price,total',
        'payments:id,bill_id,payment_number,amount_paid,payment_method,payment_reference,received_by,created_at,status,paychangu_charge_id,paychangu_trans_id',
        'payments.receivedBy:id,name',
    ]);

    $latestPayment = $bill->payments->sortByDesc('id')->first();

    return [
        'bill_id' => $bill->id,
        'bill_number' => $bill->bill_number,
        'created_at' => $bill->created_at?->toIso8601String(),
        'payment_status' => $bill->payment_status,
        'total_amount' => (float) $bill->total_amount,
        'paid_amount' => (float) $bill->paid_amount,
        'balance' => (float) $bill->balance,
        'patient' => $bill->patient ? [
            'id' => $bill->patient->id,
            'hospital_number' => $bill->patient->hospital_number,
            'first_name' => $bill->patient->first_name,
            'last_name' => $bill->patient->last_name,
        ] : null,
        'items' => $bill->items->map(fn (BillItem $item) => [
            'id' => $item->id,
            'item_name' => $item->item_name,
            'quantity' => (int) $item->quantity,
            'unit_price' => (float) $item->unit_price,
            'total' => (float) $item->total,
        ])->values(),
        'payments' => $bill->payments->map(fn (Payment $payment) => [
            'id' => $payment->id,
            'payment_number' => $payment->payment_number,
            'amount_paid' => (float) $payment->amount_paid,
            'payment_method' => $payment->payment_method,
            'payment_reference' => $payment->payment_reference,
            'received_by' => $payment->receivedBy ? ['id' => $payment->receivedBy->id, 'name' => $payment->receivedBy->name] : null,
            'created_at' => $payment->created_at?->toIso8601String(),
            'status' => $payment->status,
            'paychangu_charge_id' => $payment->paychangu_charge_id,
            'paychangu_trans_id' => $payment->paychangu_trans_id,
        ])->values(),
        'issued_by' => $latestPayment?->receivedBy ? ['id' => $latestPayment->receivedBy->id, 'name' => $latestPayment->receivedBy->name] : null,
    ];
}
```

Ensure `use App\Models\BillItem;` and `use App\Models\Payment;` are imported at the top of the service file (add if missing).

- [ ] **Step 4: Implement the controller method**

Add to `app/Http/Controllers/BillingController.php` (after `getPatientBalance`):

```php
public function receipt(Bill $bill): JsonResponse
{
    Gate::authorize('billing.view');

    return $this->success(
        $this->billingService->receipt($bill),
        'Receipt generated successfully.'
    );
}
```

- [ ] **Step 5: Register the route**

Add to `routes/api.php` immediately after the `GET /bills/{bill}/pay/{charge}/status` line (inside the authenticated group):

```php
Route::get('/bills/{bill}/receipt', [BillingController::class, 'receipt']);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `php artisan test --filter=BillingReceiptTest`
Expected: all 4 tests pass. If `BillItem::factory()` does not exist, create a `BillItemFactory` in `database/factories/` (mirror `BillFactory`/`PaymentFactory`) setting `bill_id`, `item_name`, `quantity`, `unit_price`, `total`.

- [ ] **Step 7: Update OpenAPI**

In `docs/openapi.yaml`:
1. Add the path under `paths:` in the billing section (after `GET /bills/{bill}/pay/{charge}/status`):
   ```yaml
   /bills/{bill}/receipt:
     get:
       tags: [Billing]
       summary: Get receipt snapshot for a bill
       security:
         - bearerAuth: []
       parameters:
         - $ref: '#/components/parameters/BillId'
       responses:
         '200':
           description: Receipt generated successfully.
           content:
             application/json:
               schema:
                 type: object
                 properties:
                   status:
                     type: integer
                     example: 200
                   message:
                     type: string
                   data:
                     $ref: '#/components/schemas/Receipt'
         '401':
           $ref: '#/components/responses/Unauthenticated'
         '403':
           $ref: '#/components/responses/Forbidden'
         '404':
           $ref: '#/components/responses/NotFound'
   ```
   (If `BillId` parameter / `Unauthenticated` / `Forbidden` / `NotFound` components don't exist, match the parameter/response style already used by neighboring billing paths instead.)
2. Add a `Receipt` schema under `components.schemas:` (INSERT before the `responses:` key — new schemas must NOT be added inside `components.responses`; see the PayChangu schemas at ~line 3698 for the correct insertion point):
   ```yaml
   Receipt:
     type: object
     required: [bill_id, bill_number, total_amount, paid_amount, balance]
     properties:
       bill_id:
         type: integer
       bill_number:
         type: string
       created_at:
         type: string
         format: date-time
       payment_status:
         type: string
       total_amount:
         type: number
       paid_amount:
         type: number
       balance:
         type: number
       patient:
         type: object
         properties:
           id: { type: integer }
           hospital_number: { type: string }
           first_name: { type: string }
           last_name: { type: string }
       items:
         type: array
         items:
           type: object
           properties:
             id: { type: integer }
             item_name: { type: string }
             quantity: { type: integer }
             unit_price: { type: number }
             total: { type: number }
       payments:
         type: array
         items:
           type: object
           properties:
             id: { type: integer }
             payment_number: { type: string }
             amount_paid: { type: number }
             payment_method: { type: string }
             payment_reference:
               type: string
               nullable: true
             received_by:
               type: object
               properties:
                 id: { type: integer }
                 name: { type: string }
             created_at:
               type: string
               format: date-time
             status:
               type: string
             paychangu_charge_id:
               type: string
               nullable: true
             paychangu_trans_id:
               type: string
               nullable: true
       issued_by:
         type: object
         properties:
           id: { type: integer }
           name: { type: string }
   ```
3. Validate with Python + PyYAML: `yaml.safe_load` the file and assert `d['components']['schemas']['Receipt']` exists and the path `d['paths']['/bills/{bill}/receipt']` exists.

- [ ] **Step 8: Run full backend suite**

Run: `composer test`
Expected: all tests pass (the full Pest suite, ~340 tests).

- [ ] **Step 9: Commit**

```bash
git add tests/Feature/BillingReceiptTest.php app/Services/BillingService.php app/Http/Controllers/BillingController.php routes/api.php docs/openapi.yaml
git commit -m "feat(billing): add GET /bills/{bill}/receipt endpoint"
```

---

### Task 2: Frontend — `usePayChanguCharge` hook + types

**Repo:** `C:/Users/vamp2o5/Documents/Projects/ClinOps/clinops-emr-system-frontend`

**Files:**
- Create: `lib/hooks/usePayChanguCharge.ts`
- Test: `__tests__/usePayChanguCharge.test.tsx` (new)

**Interfaces:**
- Consumes: `adminApi.getPayChanguOperators(token)`, `adminApi.initializePayChanguPayment(token, billId, { mobile, operator_ref_id, amount })`, `adminApi.verifyPayChanguPayment(token, billId, chargeId)`; types `PayChanguOperator`, `PayChanguChargeResult` from `@/lib/services/admin` (all already exist from the earlier PayChangu work).
- Produces: hook return `{ operators, operatorsLoading, operatorsError, mobile, setMobile, operatorRef, setOperatorRef, charge, polling, error, ensureOperatorsLoaded, initialize, retry, reset }`; exported constants `PAYCHANGU_POLL_INTERVAL_MS = 5000`, `PAYCHANGU_POLL_LIMIT_MS = 120000`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/usePayChanguCharge.test.tsx`:

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminApi } from "@/lib/services/admin";
import { usePayChanguCharge } from "@/lib/hooks/usePayChanguCharge";
import type { PayChanguChargeResult } from "@/lib/services/admin";

vi.mock("@/lib/services/admin", () => ({
  adminApi: {
    getPayChanguOperators: vi.fn(),
    initializePayChanguPayment: vi.fn(),
    verifyPayChanguPayment: vi.fn(),
  },
}));

const mockedAdminApi = vi.mocked(adminApi);

describe("usePayChanguCharge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads operators and surfaces errors", async () => {
    mockedAdminApi.getPayChanguOperators.mockResolvedValueOnce({
      operators: [{ id: 1, name: "Airtel Money", ref_id: "airtel", short_code: "AM" }],
    });

    const { result } = renderHook(() => usePayChanguCharge({ token: "t" }));
    await result.current.ensureOperatorsLoaded();
    await waitFor(() => {
      expect(result.current.operators).toHaveLength(1);
      expect(result.current.operators[0].name).toBe("Airtel Money");
    });
  });

  it("initializes a charge and calls onCompleted when verified", async () => {
    const charge: PayChanguChargeResult = {
      charge_id: "pc-1",
      trans_id: "tr-1",
      status: "pending",
      currency: "MWK",
      amount: 1000,
      mobile: "990000000",
      operator: "Airtel Money",
      payment_id: 42,
    };
    mockedAdminApi.initializePayChanguPayment.mockResolvedValueOnce(charge);
    mockedAdminApi.verifyPayChanguPayment.mockResolvedValueOnce({
      status: "completed",
      amount: 1000,
      completed_at: "2026-08-05T00:00:00Z",
      operator: "Airtel Money",
      currency: "MWK",
    });

    const onCompleted = vi.fn();
    const { result } = renderHook(() =>
      usePayChanguCharge({ token: "t", onCompleted })
    );

    await result.current.initialize(1, 1000);
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(onCompleted).toHaveBeenCalledWith(charge);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/usePayChanguCharge.test.tsx`
Expected: FAIL — `usePayChanguCharge` does not exist yet.

- [ ] **Step 3: Implement the hook**

Create `lib/hooks/usePayChanguCharge.ts`:

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/services/admin";
import type {
  PayChanguChargeResult,
  PayChanguOperator,
} from "@/lib/services/admin";

export const PAYCHANGU_POLL_INTERVAL_MS = 5000;
export const PAYCHANGU_POLL_LIMIT_MS = 120000;

interface UsePayChanguChargeOptions {
  token: string | null;
  onCompleted?: (charge: PayChanguChargeResult) => void;
}

export function usePayChanguCharge({ token, onCompleted }: UsePayChanguChargeOptions) {
  const [operators, setOperators] = useState<PayChanguOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(false);
  const [operatorsError, setOperatorsError] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [operatorRef, setOperatorRef] = useState("");
  const [charge, setCharge] = useState<PayChanguChargeResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const billIdRef = useRef<number | null>(null);
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const loadOperators = useCallback(async () => {
    setOperatorsLoading(true);
    setOperatorsError(null);
    try {
      const res = await adminApi.getPayChanguOperators(token);
      setOperators(res.operators ?? []);
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      setOperators([]);
      setOperatorsError(
        apiError.status === 404
          ? "PayChangu is not configured on the backend."
          : apiError.message || "Unable to load PayChangu operators."
      );
    } finally {
      setOperatorsLoading(false);
    }
  }, [token]);

  const ensureOperatorsLoaded = useCallback(() => {
    if (operators.length === 0 && !operatorsLoading && !operatorsError) {
      void loadOperators();
    }
  }, [operators.length, operatorsLoading, operatorsError, loadOperators]);

  const initialize = useCallback(
    async (billId: number, amount: number) => {
      if (!token) throw new Error("Not authenticated.");
      billIdRef.current = billId;
      const result = await adminApi.initializePayChanguPayment(token, billId, {
        mobile,
        operator_ref_id: operatorRef,
        amount,
      });
      setCharge(result);
      setPolling(true);
      setError(null);
    },
    [token, mobile, operatorRef]
  );

  const retry = useCallback(() => {
    setError(null);
    setPolling(true);
  }, []);

  const reset = useCallback(() => {
    billIdRef.current = null;
    setCharge(null);
    setPolling(false);
    setError(null);
    setMobile("");
    setOperatorRef("");
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const billId = billIdRef.current;
    if (!charge || !polling || !token || !billId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      if (Date.now() - startedAt >= PAYCHANGU_POLL_LIMIT_MS) {
        setPolling(false);
        setError(
          "Payment is still pending on the patient's phone. You can close this dialog; the payment will still be confirmed automatically if completed."
        );
        return;
      }
      try {
        const result = await adminApi.verifyPayChanguPayment(
          token,
          billId,
          charge.charge_id
        );
        if (cancelled) return;
        if (result.status === "completed") {
          setPolling(false);
          setCharge(null);
          onCompletedRef.current?.(charge);
          return;
        }
        timer = setTimeout(poll, PAYCHANGU_POLL_INTERVAL_MS);
      } catch {
        if (cancelled) return;
        setPolling(false);
        setError(
          "Unable to check the payment status. The payment will still be confirmed by webhook if the patient completes it."
        );
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [charge, polling, token]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return {
    operators,
    operatorsLoading,
    operatorsError,
    mobile,
    setMobile,
    operatorRef,
    setOperatorRef,
    charge,
    polling,
    error,
    ensureOperatorsLoaded,
    initialize,
    retry,
    reset,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run __tests__/usePayChanguCharge.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify types + lint**

Run: `npx tsc --noEmit` and `npx eslint lib/hooks/usePayChanguCharge.ts __tests__/usePayChanguCharge.test.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add lib/hooks/usePayChanguCharge.ts __tests__/usePayChanguCharge.test.tsx
git commit -m "feat(payments): add usePayChanguCharge hook"
```

---

### Task 3: Frontend — `BillPicker` and `BillPreview` components

**Repo:** `C:/Users/vamp2o5/Documents/Projects/ClinOps/clinops-emr-system-frontend`

**Files:**
- Create: `components/payments/BillPicker.tsx`
- Create: `components/payments/BillPreview.tsx`
- Create: `types/payments.ts` (shared shape types for the payments feature)

**Interfaces:**
- Consumes: `components/ui/card` (`Card`, `CardContent`, `CardHeader`, `CardTitle`), `components/ui/table`, `components/ui/button`, `components/ui/StatusBadge`, `components/ui/EmptyState`, `@/lib/utils` `cn`, lucide icons.
- Produces:
  - `types/payments.ts`:
    ```ts
    export interface BillSummary {
      id: number;
      bill_number: string;
      total_amount: number;
      paid_amount: number;
      balance: number;
      payment_status: string;
      created_at: string;
    }
    export interface BillItemLine {
      id: number;
      item_name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }
    export interface BillDetail extends BillSummary {
      items: BillItemLine[];
    }
    ```
  - `BillPickerProps`: `{ bills: BillSummary[]; selectedId: number | null; loading: boolean; onSelect: (id: number) => void }`
  - `BillPreviewProps`: `{ bill: BillDetail; loading: boolean }`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/payments-components.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { BillPicker } from "../components/payments/BillPicker";
import { BillPreview } from "../components/payments/BillPreview";
import type { BillSummary, BillDetail } from "../types/payments";

describe("BillPicker", () => {
  const bills: BillSummary[] = [
    {
      id: 2,
      bill_number: "BLL-2002",
      total_amount: 10000,
      paid_amount: 10000,
      balance: 0,
      payment_status: "Paid",
      created_at: "2026-08-05T10:00:00Z",
    },
    {
      id: 1,
      bill_number: "BLL-1001",
      total_amount: 10000,
      paid_amount: 4000,
      balance: 6000,
      payment_status: "Partially Paid",
      created_at: "2026-08-04T10:00:00Z",
    },
  ];

  it("renders each bill with balance and a collect action", () => {
    const onSelect = vi.fn();
    render(<BillPicker bills={bills} selectedId={null} loading={false} onSelect={onSelect} />);
    expect(screen.getByText("BLL-2002")).toBeInTheDocument();
    expect(screen.getByText("BLL-1001")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /collect/i })[0]);
    expect(onSelect).toHaveBeenCalledWith(2);
  });
});

describe("BillPreview", () => {
  const bill: BillDetail = {
    id: 1,
    bill_number: "BLL-1001",
    total_amount: 10000,
    paid_amount: 4000,
    balance: 6000,
    payment_status: "Partially Paid",
    created_at: "2026-08-04T10:00:00Z",
    items: [
      { id: 1, item_name: "Consultation", quantity: 1, unit_price: 10000, total: 10000 },
    ],
  };

  it("renders the item lines and balance", () => {
    render(<BillPreview bill={bill} loading={false} />);
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("MK 10,000")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run __tests__/payments-components.test.tsx`
Expected: FAIL — components do not exist.

- [ ] **Step 3: Implement the types**

Create `types/payments.ts` with the three interfaces from the Interfaces block.

- [ ] **Step 4: Implement `BillPicker`**

Create `components/payments/BillPicker.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillSummary } from "@/types/payments";

interface BillPickerProps {
  bills: BillSummary[];
  selectedId: number | null;
  loading: boolean;
  onSelect: (id: number) => void;
}

export function BillPicker({ bills, selectedId, loading, onSelect }: BillPickerProps) {
  const sorted = [...bills].sort((a, b) => {
    const rank = (s: BillSummary) =>
      s.payment_status?.toLowerCase() === "paid" ? 1 : 0;
    return rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Bill
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-8 w-8 text-muted-foreground" />}
            title="No bills found"
            description="This patient has no bills."
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border">
            {sorted.map((bill) => (
              <li key={bill.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs font-semibold">{bill.bill_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {bill.created_at ? new Date(bill.created_at).toLocaleDateString() : "—"}
                    {" · "}
                    <span className="font-mono">
                      MK {Number(bill.balance).toLocaleString()} balance
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                    bill.payment_status?.toLowerCase() === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                    bill.payment_status?.toLowerCase() === "partially_paid" && "bg-amber-50 text-amber-700 border border-amber-200",
                    bill.payment_status?.toLowerCase() === "unpaid" && "bg-red-50 text-red-700 border border-red-200"
                  )}>
                    {bill.payment_status?.replace("_", " ")}
                  </span>
                  <Button
                    size="sm"
                    variant={selectedId === bill.id ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => onSelect(bill.id)}
                  >
                    {selectedId === bill.id ? "Selected" : "Collect"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

(If `EmptyState` has a different prop signature, read `components/ui/EmptyState.tsx` and match it.)

- [ ] **Step 5: Implement `BillPreview`**

Create `components/payments/BillPreview.tsx`:

```tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { BillDetail } from "@/types/payments";

interface BillPreviewProps {
  bill: BillDetail;
  loading: boolean;
}

export function BillPreview({ bill, loading }: BillPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Bill {bill.bill_number}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-mono">MK {Number(item.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-medium">MK {Number(item.total).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                Total <span className="font-mono text-foreground ml-2">MK {Number(bill.total_amount).toLocaleString()}</span>
              </div>
              <div className="font-semibold">
                Balance <span className="font-mono ml-2 text-red-600">MK {Number(bill.balance).toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run __tests__/payments-components.test.tsx`
Expected: PASS. Adjust assertions to match the exact rendered strings (e.g. `MK 10,000` formatting).

- [ ] **Step 7: Verify types + lint**

Run: `npx tsc --noEmit` and `npx eslint components/payments/BillPicker.tsx components/payments/BillPreview.tsx types/payments.ts __tests__/payments-components.test.tsx`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add types/payments.ts components/payments/BillPicker.tsx components/payments/BillPreview.tsx __tests__/payments-components.test.tsx
git commit -m "feat(payments): add bill picker and bill preview components"
```

---

### Task 4: Frontend — `PaymentForm` component

**Repo:** `C:/Users/vamp2o5/Documents/Projects/ClinOps/clinops-emr-system-frontend`

**Files:**
- Create: `components/payments/PaymentForm.tsx`
- Create: `__tests__/payment-form.test.tsx` (new)

**Interfaces:**
- Consumes: `@/lib/api` `api`; `usePayChanguCharge` hook (Task 2); `types/payments.ts` (Task 3).
- Produces:
  ```ts
  interface RecordedPayment {
    id?: number;
    payment_number?: string;
    amount: number;
    method: string;
  }
  interface PaymentFormProps {
    token: string | null;
    billId: number;
    billNumber: string;
    balance: number;
    disabled?: boolean;               // true when the bill is fully paid
    onPaymentRecorded: (payment: RecordedPayment) => void;
    onPayChanguInitiated: (charge: PayChanguChargeResult) => void;
    onPayChanguError?: (message: string) => void;
  }
  ```
  Payment method values sent to the backend MUST be `Cash | Bank Transfer | Mobile Money | Insurance | Card` (canonical) for the direct path.

- [ ] **Step 1: Write the failing test**

Create `__tests__/payment-form.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "@/lib/api";
import { adminApi } from "@/lib/services/admin";
import { PaymentForm } from "../components/payments/PaymentForm";
import type { PayChanguChargeResult } from "@/lib/services/admin";

vi.mock("@/lib/api", () => ({
  api: { post: vi.fn() },
}));

vi.mock("@/lib/services/admin", () => ({
  adminApi: {
    getPayChanguOperators: vi.fn(),
    initializePayChanguPayment: vi.fn(),
    verifyPayChanguPayment: vi.fn(),
  },
}));

const mockedApi = vi.mocked(api);
const mockedAdminApi = vi.mocked(adminApi);

const baseProps = {
  token: "t",
  billId: 1,
  billNumber: "BLL-1001",
  balance: 6000,
  onPaymentRecorded: vi.fn(),
  onPayChanguInitiated: vi.fn(),
};

describe("PaymentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts a canonical payment method for the direct path", async () => {
    mockedApi.post.mockResolvedValueOnce({
      data: { id: 9, payment_number: "PAY-XYZ", amount_paid: 6000, payment_method: "Cash" },
    });
    const onPaymentRecorded = vi.fn();

    render(<PaymentForm {...baseProps} onPaymentRecorded={onPaymentRecorded} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText(/method/i), { target: { value: "Cash" } });
    fireEvent.click(screen.getByRole("button", { name: /record payment/i }));

    await waitFor(() => expect(onPaymentRecorded).toHaveBeenCalledTimes(1));
    expect(mockedApi.post).toHaveBeenCalledWith(
      "/bills/1/payments",
      { amount_paid: 6000, payment_method: "Cash", payment_reference: null },
      "t"
    );
  });

  it("initializes a PayChangu charge for the paychangu method", async () => {
    mockedAdminApi.getPayChanguOperators.mockResolvedValueOnce({
      operators: [{ id: 1, name: "Airtel Money", ref_id: "airtel", short_code: "AM" }],
    });
    const charge: PayChanguChargeResult = {
      charge_id: "pc-1",
      trans_id: "tr-1",
      status: "pending",
      currency: "MWK",
      amount: 6000,
      mobile: "990000000",
      operator: "Airtel Money",
      payment_id: 42,
    };
    mockedAdminApi.initializePayChanguPayment.mockResolvedValueOnce(charge);
    const onPayChanguInitiated = vi.fn();

    render(<PaymentForm {...baseProps} onPayChanguInitiated={onPayChanguInitiated} />);

    fireEvent.change(screen.getByLabelText(/method/i), { target: { value: "paychangu" } });
    await waitFor(() =>
      expect(screen.getByLabelText(/operator/i)).toBeInTheDocument()
    );
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "6000" } });
    fireEvent.change(screen.getByLabelText(/operator/i), { target: { value: "airtel" } });
    fireEvent.change(screen.getByLabelText(/mobile/i), { target: { value: "990000000" } });
    fireEvent.click(screen.getByRole("button", { name: /request payment/i }));

    await waitFor(() => expect(onPayChanguInitiated).toHaveBeenCalledTimes(1));
    expect(mockedAdminApi.initializePayChanguPayment).toHaveBeenCalledWith("t", 1, {
      mobile: "990000000",
      operator_ref_id: "airtel",
      amount: 6000,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/payment-form.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `PaymentForm`**

Create `components/payments/PaymentForm.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePayChanguCharge } from "@/lib/hooks/usePayChanguCharge";
import type { PayChanguChargeResult } from "@/lib/services/admin";

export interface RecordedPayment {
  id?: number;
  payment_number?: string;
  amount: number;
  method: string;
}

interface PaymentFormProps {
  token: string | null;
  billId: number;
  billNumber: string;
  balance: number;
  disabled?: boolean;
  onPaymentRecorded: (payment: RecordedPayment) => void;
  onPayChanguInitiated: (charge: PayChanguChargeResult) => void;
}

const DIRECT_METHODS: Array<[string, string]> = [
  ["Cash", "Cash"],
  ["Bank Transfer", "Bank Transfer"],
  ["Mobile Money", "Mobile Money"],
  ["Insurance", "Insurance"],
  ["Card", "Card"],
];

export function PaymentForm({
  token,
  billId,
  billNumber,
  balance,
  disabled = false,
  onPaymentRecorded,
  onPayChanguInitiated,
}: PaymentFormProps) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const paychangu = usePayChanguCharge({ token, onCompleted: onPayChanguInitiated });
  const isPayChangu = method === "paychangu";

  useEffect(() => {
    if (isPayChangu) paychangu.ensureOperatorsLoaded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPayChangu]);

  const submitDisabled =
    disabled ||
    processing ||
    paychangu.charge !== null ||
    !amount ||
    (isPayChangu &&
      (paychangu.operators.length === 0 ||
        paychangu.operatorsError !== null ||
        !paychangu.operatorRef ||
        !paychangu.mobile));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setProcessing(true);
    setFormError(null);
    try {
      const parsedAmount = parseFloat(amount);
      if (isPayChangu) {
        const charge = await paychangu.initialize(billId, parsedAmount);
        onPayChanguInitiated(charge);
      } else {
        const res = await api.post(
          `/bills/${billId}/payments`,
          {
            amount_paid: parsedAmount,
            payment_method: method,
            payment_reference: reference || null,
          },
          token
        );
        const payment = (res as { data?: RecordedPayment }).data ?? {};
        onPaymentRecorded({
          id: payment.id,
          payment_number: payment.payment_number,
          amount: parsedAmount,
          method,
        });
      }
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      if (apiError.status === 422) {
        const first = apiError.errors ? Object.values(apiError.errors)[0]?.[0] : undefined;
        setFormError(first || "Invalid payment details.");
      } else if (apiError.status === 502) {
        setFormError("Unable to initialize payment with PayChangu.");
      } else {
        setFormError(apiError.message || "Failed to record payment.");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Record Payment — {billNumber}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {disabled && (
            <p className="text-sm text-emerald-700 font-semibold">This bill is fully paid.</p>
          )}
          {(formError || paychangu.error) && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800 font-semibold">
              {paychangu.error || formError}
            </p>
          )}
          {isPayChangu && paychangu.charge && (
            <p className="rounded-lg bg-sky-50 border border-sky-200 px-3 py-2 text-sm text-sky-800 font-semibold">
              Payment initiated. Ask the patient to complete it on their phone (charge{" "}
              <span className="font-mono">{paychangu.charge.charge_id}</span>). Waiting for confirmation…
            </p>
          )}

          <div>
            <label htmlFor="payment-amount" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
              Amount (MK) *
            </label>
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balance}
              required
              aria-label="amount"
              className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div>
            <label htmlFor="payment-method" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
              Payment Method *
            </label>
            <select
              id="payment-method"
              aria-label="method"
              className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              value={method}
              onChange={(e) => {
                setMethod(e.target.value);
                setFormError(null);
                if (e.target.value !== "paychangu") paychangu.reset();
              }}
              disabled={disabled}
            >
              {DIRECT_METHODS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
              <option value="paychangu">Mobile Money (PayChangu)</option>
            </select>
          </div>

          {isPayChangu ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="pc-operator" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Operator *
                </label>
                <select
                  id="pc-operator"
                  aria-label="operator"
                  className="block w-full px-3 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={paychangu.operatorRef}
                  onChange={(e) => paychangu.setOperatorRef(e.target.value)}
                >
                  <option value="">Select operator…</option>
                  {paychangu.operators.map((op) => (
                    <option key={op.id} value={op.ref_id}>{op.name}</option>
                  ))}
                </select>
                {paychangu.operatorsLoading && (
                  <p className="text-xs text-muted-foreground mt-1">Loading operators…</p>
                )}
                {paychangu.operatorsError && (
                  <p className="text-xs text-red-600 mt-1">{paychangu.operatorsError}</p>
                )}
              </div>
              <div>
                <label htmlFor="pc-mobile" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                  Mobile Number *
                </label>
                <input
                  id="pc-mobile"
                  type="tel"
                  aria-label="mobile"
                  placeholder="e.g. 990000000"
                  className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={paychangu.mobile}
                  onChange={(e) => paychangu.setMobile(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="payment-reference" className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                Reference Number
              </label>
              <input
                id="payment-reference"
                type="text"
                aria-label="reference"
                className="block w-full px-3 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Transaction/receipt reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={disabled}
              />
            </div>
          )}

          <Button type="submit" disabled={submitDisabled}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPayChangu ? "Request Payment" : "Record Payment"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

Note: `usePayChanguCharge` already calls `onCompleted` when verification succeeds — in this design `onCompleted` IS `onPayChanguInitiated`. `initialize()` returns the charge, and the form forwards it to `onPayChanguInitiated` immediately (to show a pending state), while polling continues in the hook. The parent treats repeated `onPayChanguInitiated` calls (initial + completed) as "charge active" and only switches to the receipt when polling has ended and the payment is confirmed. To make this unambiguous, keep the parent logic driven by the hook's `polling`/`charge` states described in Task 6.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run __tests__/payment-form.test.tsx`
Expected: PASS (2 tests). Adjust selectors if the rendered markup differs.

- [ ] **Step 5: Verify types + lint**

Run: `npx tsc --noEmit` and `npx eslint components/payments/PaymentForm.tsx __tests__/payment-form.test.tsx`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add components/payments/PaymentForm.tsx __tests__/payment-form.test.tsx
git commit -m "feat(payments): add payment form with direct and paychangu methods"
```

---

### Task 5: Frontend — `Receipt` component

**Repo:** `C:/Users/vamp2o5/Documents/Projects/ClinOps/clinops-emr-system-frontend`

**Files:**
- Create: `components/payments/Receipt.tsx`
- Create: `__tests__/receipt.test.tsx` (new)
- Modify: `types/payments.ts` (add `ReceiptData`)

**Interfaces:**
- Consumes: the receipt JSON shape from Task 1 (backend `data`).
- Produces:
  ```ts
  // in types/payments.ts
  export interface ReceiptPayment {
    id: number;
    payment_number: string | null;
    amount_paid: number;
    payment_method: string;
    payment_reference: string | null;
    received_by: { id: number; name: string } | null;
    created_at: string | null;
    status: string | null;
    paychangu_charge_id: string | null;
    paychangu_trans_id: string | null;
  }
  export interface ReceiptData {
    bill_id: number;
    bill_number: string;
    created_at: string | null;
    payment_status: string | null;
    total_amount: number;
    paid_amount: number;
    balance: number;
    patient: { id: number; hospital_number: string; first_name: string; last_name: string } | null;
    items: Array<{ id: number; item_name: string; quantity: number; unit_price: number; total: number }>;
    payments: ReceiptPayment[];
    issued_by: { id: number; name: string } | null;
  }
  interface ReceiptProps {
    receipt: ReceiptData;
    highlightPaymentId?: number;
    onDone: () => void;
  }
  ```

- [ ] **Step 1: Write the failing test**

Create `__tests__/receipt.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Receipt } from "../components/payments/Receipt";
import type { ReceiptData } from "../types/payments";

const receipt: ReceiptData = {
  bill_id: 1,
  bill_number: "BLL-1001",
  created_at: "2026-08-05T10:00:00Z",
  payment_status: "Partially Paid",
  total_amount: 10000,
  paid_amount: 6000,
  balance: 4000,
  patient: { id: 1, hospital_number: "H-0001", first_name: "Jane", last_name: "Doe" },
  items: [{ id: 1, item_name: "Consultation", quantity: 1, unit_price: 10000, total: 10000 }],
  payments: [
    { id: 42, payment_number: "PAY-XYZ", amount_paid: 6000, payment_method: "Cash", payment_reference: null, received_by: { id: 2, name: "Cashier" }, created_at: "2026-08-05T10:05:00Z", status: "completed", paychangu_charge_id: null, paychangu_trans_id: null },
  ],
  issued_by: { id: 2, name: "Cashier" },
};

describe("Receipt", () => {
  it("renders bill, patient, items, payment and totals", () => {
    render(<Receipt receipt={receipt} highlightPaymentId={42} onDone={vi.fn()} />);
    expect(screen.getByText("Receipt")).toBeInTheDocument();
    expect(screen.getByText("BLL-1001")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("PAY-XYZ")).toBeInTheDocument();
  });

  it("fires onDone when Done is pressed", () => {
    const onDone = vi.fn();
    render(<Receipt receipt={receipt} onDone={onDone} />);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("has a Print button", () => {
    render(<Receipt receipt={receipt} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run __tests__/receipt.test.tsx`
Expected: FAIL — component and types do not exist.

- [ ] **Step 3: Add `ReceiptData` types**

Add the `ReceiptPayment` and `ReceiptData` interfaces to `types/payments.ts` (from the Interfaces block).

- [ ] **Step 4: Implement `Receipt`**

Create `components/payments/Receipt.tsx`:

```tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReceiptData } from "@/types/payments";

interface ReceiptProps {
  receipt: ReceiptData;
  highlightPaymentId?: number;
  onDone: () => void;
}

export function Receipt({ receipt, highlightPaymentId, onDone }: ReceiptProps) {
  const fmt = (n: number) => `MK ${Number(n).toLocaleString()}`;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold">Receipt</h3>
              <p className="font-mono text-sm text-muted-foreground">{receipt.bill_number}</p>
            </div>
            {receipt.patient && (
              <div className="text-right text-sm">
                <p className="font-semibold">
                  {receipt.patient.first_name} {receipt.patient.last_name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {receipt.patient.hospital_number}
                </p>
              </div>
            )}
          </div>

          <div className="my-4">
            {receipt.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No line items.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {receipt.items.map((item) => (
                  <li key={item.id} className="py-2 flex items-center justify-between text-sm">
                    <span>
                      {item.item_name}{" "}
                      <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                    </span>
                    <span className="font-mono">{fmt(item.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono">{fmt(receipt.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-mono text-emerald-600">{fmt(receipt.paid_amount)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance Due</span>
              <span className="font-mono text-red-600">{fmt(receipt.balance)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1 border-t pt-3">
            {receipt.payments.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center justify-between rounded px-2 py-1 text-sm",
                  highlightPaymentId === p.id && "bg-emerald-50 border border-emerald-200"
                )}
              >
                <span className="flex items-center gap-1.5">
                  {highlightPaymentId === p.id && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                  <span className="font-mono">{p.payment_number || `#${p.id}`}</span>
                  <span className="text-xs text-muted-foreground">{p.payment_method}</span>
                </span>
                <span className="font-mono">{fmt(p.amount_paid)}</span>
              </div>
            ))}
            {receipt.issued_by && (
              <p className="pt-2 text-xs text-muted-foreground">
                Collected by {receipt.issued_by.name} ·{" "}
                {receipt.payments[0]?.created_at
                  ? new Date(receipt.payments[0].created_at).toLocaleString()
                  : new Date(receipt.created_at ?? Date.now()).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button onClick={onDone}>Done</Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run __tests__/receipt.test.tsx`
Expected: PASS (3 tests). `window.print` is not called in tests (the Print test only checks presence).

- [ ] **Step 6: Verify types + lint**

Run: `npx tsc --noEmit` and `npx eslint components/payments/Receipt.tsx __tests__/receipt.test.tsx`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add types/payments.ts components/payments/Receipt.tsx __tests__/receipt.test.tsx
git commit -m "feat(payments): add printable receipt component"
```

---

### Task 6: Frontend — Rewire `/payments` page and remove skeletons

**Repo:** `C:/Users/vamp2o5/Documents/Projects/ClinOps/clinops-emr-system-frontend`

**Files:**
- Rewrite: `app/(app)/payments/page.tsx`
- Delete: `components/payments/BillPreviewSkeleton.tsx`, `components/payments/PaymentFormSkeleton.tsx`, `components/payments/ReceiptPreviewSkeleton.tsx`, `components/payments/BackendNote.tsx`

**Interfaces:**
- Consumes: Task 1 endpoint shapes; Task 2 hook; Task 3/4/5 components and `types/payments.ts`; `@/lib/api` `api`; `@/lib/services/admin` `PayChanguChargeResult`.
- Produces: a working `/payments` page. No new exported types.

**Behavior:**
- Patient search (existing code): `GET /patients?search=`.
- On patient select: `GET /bills?patient_id={id}` → `data` is `BillSummary[]` (paginated array) → render `BillPicker`.
- On bill select: `GET /bills/{id}` → `data` is `BillDetail` → render `BillPreview` + `PaymentForm` (disabled when `payment_status === "Paid"`).
- Direct payment: `onPaymentRecorded` → fetch `GET /bills/{id}/receipt` → render `Receipt` with `highlightPaymentId` from the recorded payment.
- PayChangu: `onPayChanguInitiated(charge)` sets `pendingCharge` (shows the pending notice already inside `PaymentForm`). When the hook's polling completes (see Task 4 note: parent tracks `charge`/`polling` via a local wrapper OR the hook's `onCompleted`), fetch the receipt and render `Receipt` with `highlightPaymentId = charge.payment_id`. To keep this simple: pass `onCompleted` to the hook is internal to `PaymentForm`; instead, have `PaymentForm`'s `onPayChanguInitiated` be called twice (once on init, once on completion). The page distinguishes by the charge result — on the completion call, `onPayChanguInitiated` is invoked from the hook's `onCompleted`; to avoid ambiguity, treat EVERY `onPayChanguInitiated` call as "charge active → start showing receipt only when polling stops". **Simplest correct wiring:** give `PaymentForm` an extra optional prop `onPayChanguCompleted: (charge: PayChanguChargeResult) => void` and pass it as the hook's `onCompleted`. Then:
  - `onPayChanguInitiated(charge)` → set `pendingCharge`, stay on the form (polling notice is visible).
  - `onPayChanguCompleted(charge)` → fetch receipt, set `highlightPaymentId = charge.payment_id`, render `Receipt`.

- [ ] **Step 1: Update `PaymentForm` to expose completion**

In `components/payments/PaymentForm.tsx` add an optional prop `onPayChanguCompleted?: (charge: PayChanguChargeResult) => void` and change the hook call to:
```tsx
const paychangu = usePayChanguCharge({
  token,
  onCompleted: onPayChanguCompleted ?? onPayChanguInitiated,
});
```
Keep the explicit `onPayChanguInitiated(charge)` call after `initialize` (shows the pending state). Update the Task 4 test only if the component contract changes in a way that breaks it (it should not).

- [ ] **Step 2: Write the page**

Rewrite `app/(app)/payments/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/store/RoleContext";
import { BillPicker } from "@/components/payments/BillPicker";
import { BillPreview } from "@/components/payments/BillPreview";
import { PaymentForm, type RecordedPayment } from "@/components/payments/PaymentForm";
import { Receipt } from "@/components/payments/Receipt";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, Loader2 } from "lucide-react";
import type { BillSummary, BillDetail, ReceiptData } from "@/types/payments";
import type { PayChanguChargeResult } from "@/lib/services/admin";

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  hospital_number: string;
}

export default function PaymentsPage() {
  const { token } = useAuth();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [bills, setBills] = useState<BillSummary[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const [billDetail, setBillDetail] = useState<BillDetail | null>(null);
  const [billLoading, setBillLoading] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [highlightPaymentId, setHighlightPaymentId] = useState<number | undefined>(undefined);
  const [pageError, setPageError] = useState<string | null>(null);

  async function searchPatients(query: string) {
    setPatientQuery(query);
    if (query.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(query)}`, token);
      setPatientResults(res?.data ?? []);
    } catch {
      setPatientResults([]);
    }
  }

  async function selectPatient(patient: Patient) {
    setSelectedPatient(patient);
    setPatientResults([]);
    setPatientQuery("");
    setSelectedBillId(null);
    setBillDetail(null);
    setReceipt(null);
    setPageError(null);
    setBillsLoading(true);
    try {
      const res = await api.get(`/bills?patient_id=${patient.id}`, token);
      setBills((res?.data as BillSummary[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load bills.";
      setPageError(message);
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }

  async function selectBill(billId: number) {
    setSelectedBillId(billId);
    setBillDetail(null);
    setReceipt(null);
    setPageError(null);
    setBillLoading(true);
    try {
      const res = await api.get(`/bills/${billId}`, token);
      setBillDetail((res?.data as BillDetail) ?? null);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load bill.");
    } finally {
      setBillLoading(false);
    }
  }

  async function loadReceipt(highlightId?: number) {
    if (!selectedBillId || !token) return;
    setHighlightPaymentId(highlightId);
    setReceiptLoading(true);
    try {
      const res = await api.get(`/bills/${selectedBillId}/receipt`, token);
      setReceipt((res?.data as ReceiptData) ?? null);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load receipt.");
    } finally {
      setReceiptLoading(false);
    }
  }

  const handlePaymentRecorded = (payment: RecordedPayment) => {
    void loadReceipt(payment.id);
  };

  const handlePayChanguInitiated = () => {
    // keep the form visible while the charge is pending (PaymentForm shows the notice)
  };

  const handlePayChanguCompleted = (charge: PayChanguChargeResult) => {
    void loadReceipt(charge.payment_id);
  };

  const handleDone = () => {
    setReceipt(null);
    setBillDetail(null);
    setSelectedBillId(null);
    void selectPatient(selectedPatient as Patient);
  };

  const isPaid = billDetail?.payment_status?.toLowerCase() === "paid";

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="flex flex-col gap-1">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
          Finance
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Payments
        </h1>
        <p className="text-sm text-muted-foreground">
          Collect payment and print receipts
        </p>
      </section>

      {pageError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold">
          {pageError}
        </div>
      )}

      {/* Patient Search */}
      <section className="bg-card rounded-lg border p-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search patient by name or hospital number..."
            aria-label="Search patient for payment"
            className="w-full px-4 py-2 border border-input rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={patientQuery}
            onChange={(e) => searchPatients(e.target.value)}
          />
          {patientResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-border rounded-lg bg-card shadow-lg max-h-48 overflow-y-auto">
              {patientResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-muted flex items-center justify-between border-b border-border last:border-b-0"
                >
                  <span className="font-semibold">{p.first_name} {p.last_name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.hospital_number}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {!selectedPatient && (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold">Search for a patient</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Find a patient to view their bill and collect payment
          </p>
        </div>
      )}

      {selectedPatient && !receipt && (
        <>
          <section className="bg-card rounded-lg border p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">
                {selectedPatient.hospital_number}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedPatient(null);
                setBills([]);
                setBillDetail(null);
                setReceipt(null);
              }}
              className="text-xs font-bold text-red-600 hover:text-red-800 uppercase tracking-wider"
            >
              Clear
            </button>
          </section>

          {billDetail ? (
            <>
              <BillPreview bill={billDetail} loading={billLoading} />
              <PaymentForm
                token={token}
                billId={billDetail.id}
                billNumber={billDetail.bill_number}
                balance={billDetail.balance}
                disabled={isPaid}
                onPaymentRecorded={handlePaymentRecorded}
                onPayChanguInitiated={handlePayChanguInitiated}
                onPayChanguCompleted={handlePayChanguCompleted}
              />
            </>
          ) : (
            <BillPicker
              bills={bills}
              selectedId={selectedBillId}
              loading={billsLoading}
              onSelect={(id) => void selectBill(id)}
            />
          )}
        </>
      )}

      {(receiptLoading || receipt) && selectedPatient && (
        <section>
          {receiptLoading ? (
            <div className="bg-card rounded-lg border p-6">
              <Skeleton className="h-32 w-full" />
            </div>
          ) : receipt ? (
            <Receipt receipt={receipt} highlightPaymentId={highlightPaymentId} onDone={handleDone} />
          ) : null}
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Delete the skeleton components**

```bash
git rm components/payments/BillPreviewSkeleton.tsx components/payments/PaymentFormSkeleton.tsx components/payments/ReceiptPreviewSkeleton.tsx components/payments/BackendNote.tsx
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` and `npx eslint app/"(app)"/payments/page.tsx components/payments/PaymentForm.tsx` (quote the parenthesized path for eslint, e.g. `npx eslint "app/(app)/payments/page.tsx" components/payments/PaymentForm.tsx`).
Then run: `npx vitest run __tests__/payments-components.test.tsx __tests__/payment-form.test.tsx __tests__/receipt.test.tsx __tests__/usePayChanguCharge.test.tsx __tests__/billing.test.ts __tests__/billing-confirmation.test.tsx`
Expected: all tests pass. Fix the page (e.g., `EmptyState`/`Skeleton` import paths, `api.get` return typing) as needed.

- [ ] **Step 5: Commit**

```bash
git add app/"(app)"/payments/page.tsx components/payments/BillPreviewSkeleton.tsx components/payments/PaymentFormSkeleton.tsx components/payments/ReceiptPreviewSkeleton.tsx components/payments/BackendNote.tsx
git rm -r --cached components/payments/BillPreviewSkeleton.tsx components/payments/PaymentFormSkeleton.tsx components/payments/ReceiptPreviewSkeleton.tsx components/payments/BackendNote.tsx
git commit -m "feat(payments): implement cashier payment flow"
```

(If `git add`/`git rm` stages the deletions correctly, a plain `git add -A components/payments` is acceptable — stage only the payments files, not unrelated changes.)

---

## Self-Review Notes

- Spec coverage: receipt endpoint (Task 1), hook (Task 2), picker/preview (Task 3), payment form incl. PayChangu (Task 4), receipt (Task 5), page wiring + skeleton removal (Task 6). Edge cases (no bills, paid bill, operators error) are in Task 3/4/6. Error mapping (422/502/404) in Task 4/6.
- Type consistency: `BillSummary`, `BillDetail`, `ReceiptData`, `RecordedPayment`, `PayChanguChargeResult` names are used identically across tasks. Backend receipt field names in Task 5 match the Task 1 response shape.
- Canonical payment methods (`Cash`, `Bank Transfer`, `Mobile Money`, `Insurance`, `Card`) enforced in Task 4 and the global constraints.
