# Specialist-Aware Appointment Creation

> **Status:** Awaiting approval
> **Date:** 2026-08-09
> **Author:** Antigravity (via receptionist workflow review)
> **Scope:** Frontend only (`components/appointments/NewAppointmentModal.tsx`)

---

## Background

The receptionist's **New Appointment** modal already exists and works, but its "Provider" field is a generic text search over **all active users** — it has no concept of what specialty a patient is being booked into. The goal is to make the form flow naturally for the real use case: "Book this patient into **Lab**, **Radiology**, **Surgical OPD**, etc." and then surface only the right providers for that service.

---

## How the Existing System Fits

| Layer | What already exists | Gap |
|---|---|---|
| `appointment_type` field (DB + API) | Free-text string (Consultation, Follow-up, Lab Review, Emergency) | No link between type and a specialist category |
| `department_id` (DB + API) | Optional FK to `departments` — auto-loaded in the form as a plain dropdown | Not used to filter providers |
| `provider_id` (DB + API) | Optional FK to `users` — searched via `GET /users?search=…&is_active=true` | No role/department pre-filter |
| `GET /users` | Accepts `?role=…&department_id=…&is_active=…` | Never used together by the form |
| Roles seeded | Doctor, Clinical Officer, Nurse, Lab Technician, Radiographer, Pharmacist … | Frontend doesn't know about these |

**Key insight:** The backend already supports `GET /users?role=Lab+Technician&is_active=true` and
`GET /users?department_id=5&is_active=true`. No backend changes are needed — this is a pure **frontend improvement**.

---

## Proposed UX Flow (in the modal)

```
1. Receptionist picks an Appointment Category  ← NEW (replaces free-text type)
        │
        ├── Consultation / Follow-up
        │       → Department dropdown populates (all depts)
        │       → Provider search filtered to: Doctor | Clinical Officer | Medical Student
        │
        ├── Lab Test
        │       → Department pre-selects "Laboratory" if it exists
        │       → Provider filtered to role: Lab Technician
        │
        ├── Radiology / Imaging
        │       → Department pre-selects "Radiology"
        │       → Provider filtered to role: Radiographer
        │
        ├── Pharmacy Review
        │       → Provider filtered to role: Pharmacist
        │
        └── Emergency
                → No provider pre-filter (any active user)
```

This removes the "guess who to search for" problem. The receptionist picks a category,
the form automatically narrows both the department and the provider list.

---

## Open Questions (need answers before coding)

### Q1 — Department name matching
The auto-select logic (pre-selecting "Laboratory" when category is "Lab Test") will match
by department name substring. If your departments are named differently (e.g., "MLST Lab",
"Haematology"), we need to either:
- (a) Match by code instead of name, **or**
- (b) Skip the auto-select and just filter providers by role

**What are your actual department names/codes?**

### Q2 — Is provider required for specialist categories?
Currently the provider field is optional. For specialist appointments (Lab, Radiology)
should it become **required** so that a lab tech is always assigned, or stay optional
(the worklist handles routing)?

### Q3 — appointment_type sent to backend
Should "Lab Test" / "Radiology" / "Pharmacy Review" be sent as `appointment_type` to
the backend (so the appointments list can filter by them), or should the backend still
receive the existing generic types (e.g. "Consultation")?

---

## Proposed Changes

### `components/appointments/NewAppointmentModal.tsx` — MODIFY

| Change | Detail |
|---|---|
| Replace free-text `appointment_type` select | Use a **category config** object mapping each category to: (a) `appointment_type` string for the backend, (b) roles to filter providers by, (c) optional department name hint for auto-select |
| Provider field: switch from search-on-type → **auto-load on category select** | When a category is chosen, call `GET /users?role=<role>&is_active=true&per_page=100` immediately. Show results in a scrollable dropdown. Falls back to typed search for "Consultation" (many doctors). |
| Department: auto-select on category change | Find the matching department from the already-loaded `departments` array and pre-select it. User can still override. |
| Provider display: show role + department in results | Each dropdown option shows `name • role • department` so the receptionist can disambiguate. |

No other files need to change for the MVP.

---

## Verification Plan

### Manual
- Open appointments page → click "New Appointment"
- Select **Lab Test** → provider dropdown auto-loads Lab Technicians only, "Laboratory" dept pre-selected
- Select **Radiology** → Radiographers only, "Radiology" dept pre-selected
- Select **Consultation** → search-as-you-type remains (too many doctors to preload)
- Submit → appointment appears in the list with correct type and provider

### Automated
- No new tests required (existing `AppointmentTest.php` covers the backend, which is unchanged)
