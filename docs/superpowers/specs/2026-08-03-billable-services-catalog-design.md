# Billable Services Catalog — UX Design

**Date:** 2026-08-03
**Status:** Approved (design stage)
**Scope:** Frontend only (`clinops-emr-system-frontend`)

## Problem

To make a service billable, admins must create a `Service` record and
remember the exact name (and feel they must remember the code) that the
billing engine looks up (`BillingService::resolveService` matches by
`name` + `category`). This is friction, especially for lab tests, where
billing matches a service whose `name` equals the lab test's name in the
`Lab` category — a silently $0 line appears when names drift.

Admins want:
1. To see every auto-billed service in one place and configure its price.
2. For services not yet set up, to pick them from a dropdown rather than
   typing an exact name/code.

## Approach

Enhance the existing services catalog page
(`app/(admin)/system/catalogs/services/page.tsx`). No backend changes:
the catalog endpoints (`GET /api/services`, `PUT /api/services/{id}`,
`POST /api/services`) and the LOINC lookup (`GET /loinc/search?q=`) already
support everything needed.

## Components

### 1. "Auto-billed" quick-view panel

A pinned card above the existing services table listing the five seeded
auto-billed services, matched by their seeded codes:

| Code | Name | Category |
|------|------|----------|
| `CONS-OPD` | OPD Consultation | Consultation |
| `CONS-EMG` | Emergency Consultation | Consultation |
| `CONS-INP` | Inpatient Consultation | Consultation |
| `ADM-FEE` | Admission Fee | Misc |
| `DIS-FEE` | Discharge Fee | Misc |

- Each row shows the name plus an editable price field and a Save button.
- Save calls `adminApi.updateService` (`PUT /services/{id}`) with the new
  `unit_price`; on success the panel refreshes; on failure the page-level
  error banner shows the message (same pattern as today).
- If a seeded service is missing from the catalog, render the row with a
  "Create" button that calls `adminApi.createService` with the seeded
  code/name/category and the entered price, so the list is always complete.
- Editing here requires `catalog.manage` (the same gate as the rest of the
  page; hide the controls otherwise, matching existing `canManage` usage).
- Row data comes from the same `GET /api/services` load already used by
  the page (matched client-side by code), so no new endpoint or fetch.

### 2. LOINC dropdown for Lab services

In the existing New/Edit service modal:

- When the `category` field is set to `Lab`, show a "Pick lab test"
  searchable select above the manual fields.
- Typing queries `GET /loinc/search?q=` (needs ≥2 characters, per the
  existing endpoint).
- Selecting a result auto-fills:
  - `name` = LOINC `display_name`
  - `code` = `LAB-<loinc code>` (auto-generated, e.g. `LAB-718-7`)
  - `category` = `Lab`
- Manual name/code/category editing stays available (fields unchanged);
  the dropdown is the "no memory" path. Switching category away from
  `Lab` hides the dropdown.
- Duplicate-code on manual entry surfaces the existing 422 message.

### 3. Unchanged

- The full services table, search, category filter, Edit/Delete actions,
  and permission gating stay exactly as today.
- No new backend routes, migrations, permissions, or payload changes.

## Data Flow

1. Page mounts → `load()` fetches `GET /api/services` (existing).
2. Quick-view panel picks the 5 seeded rows by code from the loaded items
   (plus an empty row per missing code for Create).
3. Price save → `PUT /api/services/{id}` → reload.
4. LOINC pick → `GET /loinc/search?q=` (debounced/on-Enter) → autofill.

## Error Handling

- Inline price save failure → existing page-level error banner.
- LOINC search returns empty → "No matches" in the dropdown.
- Duplicate code on manual entry → existing 422 message.
- Missing seeded service → Create button path (see Component 1).

## Testing

- `npx tsc --noEmit` passes.
- `npm run test` stays green (62/62).
- No new unit tests unless the repo's render-test harness makes a page
  test easy; primary verification is typecheck + existing suite.

## Out of Scope

- Backend changes (none needed).
- Auto-creating `Lab` services at bill time (Approach C) — can be a
  follow-up.
- Dedicated "Billing settings" page (Approach B) — rejected in favor of
  enhancing the existing catalog page.
