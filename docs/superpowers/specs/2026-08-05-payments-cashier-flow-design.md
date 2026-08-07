# Payments Cashier Flow — Design

Date: 2026-08-05
Status: Approved (sections 1 and 2 signed off by user)
Repos: `clinops-emr-system-frontend` (primary), `ClinOps-EMR-System-backend` (supporting endpoint)

## Goal

Turn the prototype page at `app/(app)/payments/page.tsx` (currently skeletons + a "billing backend required" note) into a working cashier flow: search a patient, pick one of their bills, preview it, record a payment (direct methods or PayChangu mobile money), then show a printable receipt.

## Approach

Componentized rebuild using the app's current shadcn-style conventions (Card, Button, Input, Select, Table, Badge) matching the Billing page. One new backend endpoint returns receipt data.

## Data flow

```
patient search (GET /patients?search=)
  -> patient selected
  -> bills list (GET /bills?patient_id={id})        [BillPicker]
  -> bill selected
  -> bill detail (GET /bills/{id})                  [BillPreview]
  -> payment form (POST /bills/{id}/payments  OR  PayChangu initialize + verify)
  -> payment success
  -> receipt (GET /bills/{id}/receipt)              [Receipt, printable]
```

## Backend — `GET /bills/{bill}/receipt`

- Route (inside the billing route group): `GET /api/bills/{bill}/receipt` -> `BillingController@receipt`.
- Authorization: `billing.view` via `Gate::authorize`.
- Controller is thin: authorize, call `BillingService::receipt($bill)`, return `$this->success(...)`.
- `BillingService::receipt(Bill $bill)` returns a print snapshot array:

  ```
  {
    bill_id, bill_number, created_at, payment_status,
    total_amount, paid_amount, balance,
    patient:   { id, hospital_number, first_name, last_name },
    items:     [ { id, item_name, quantity, unit_price, total } ],
    payments:  [ { id, payment_number, amount_paid, payment_method,
                   payment_reference, received_by: { id, name },
                   created_at, status, paychangu_charge_id, paychangu_trans_id } ],
    issued_by: { id, name }   // the cashier who recorded the last payment
  }
  ```

- Files: `app/Http/Controllers/BillingController.php`, `app/Services/BillingService.php`, `routes/api.php`.
- Tests: new `tests/Feature/BillingReceiptTest.php` — success shape, 404 unknown bill, 401 unauthenticated, 403 forbidden (no `billing.view`).
- OpenAPI: add path + `Receipt` schema under `components.schemas`.

## Frontend

### Page — `app/(app)/payments/page.tsx`

Replace prototype. Keeps the patient search (already wired). After selecting a patient, renders BillPicker, BillPreview, PaymentForm, and Receipt. Removes the `BackendNote` and skeleton components.

### Components — `components/payments/` (skeletons deleted)

- `BillPicker.tsx` — lists the patient's bills from `GET /bills?patient_id=`; unpaid/partial bills first; shows bill number, total, balance, payment status badge; cashier selects one.
- `BillPreview.tsx` — items table plus totals and balance from `GET /bills/{id}`.
- `PaymentForm.tsx` — amount, payment method select, optional reference. Direct methods (Cash, Bank Transfer, Mobile Money, Insurance, Card) POST to `/bills/{id}/payments`. Mobile Money (PayChangu) shows operator dropdown + mobile input and calls `initializePayChanguPayment`, then polls `verifyPayChanguPayment` (5s, ~2min), same UX as the Billing page. Disabled when the bill is fully paid.
- `Receipt.tsx` — fetches `GET /bills/{id}/receipt`, renders a print-friendly panel, highlights the payment just recorded (matched by `payment_number`/`id` from the `recordPayment` or PayChangu success response), Print button calls `window.print()`.

### Shared hook — `lib/hooks/usePayChanguCharge.ts`

Encapsulates operators fetch, charge initialization, verify polling, and cleanup. Used by `PaymentForm`. The Billing page keeps its existing inline logic (adopting the hook is a documented follow-up, out of scope).

### Conventions

- All API calls through `@/lib/api` with the `useAuth()` token.
- Currency rendered as `MK`.
- Validation/API errors shown inline; 422 shows the first validation message; 502 shows "Unable to initialize payment with PayChangu."; 403 surfaces the backend message; 404 shows a billing-not-configured-style banner.

### Edge cases

- No bills -> empty state: "No bills found for this patient."
- Bill fully paid -> payment form disabled with a paid status shown.
- Operators fetch fails -> PayChangu option disabled with a message; direct methods still usable.
- Modal/form cleanup on close and after success.

### Frontend verification

- `npx tsc --noEmit`
- `npm run lint`
- Run existing vitest tests; keep them passing.
- Commit message: `feat(payments): implement cashier payment flow`.

## Out of scope (follow-ups)

- Refactor `app/(app)/billing/page.tsx` to use `usePayChanguCharge`.
- Any receipt persistence/audit trail beyond what the backend returns.
