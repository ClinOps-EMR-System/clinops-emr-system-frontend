# ClinOps EMR — Web App

<p align="center"><b>Task-first clinical UI for a teaching-hospital EMR</b></p>

Frontend for **ClinOps EMR** — registration, triage, consultation, laboratory, imaging, pharmacy, admissions, billing, and the System Admin console. Permission-gated, dense, and fast under pressure.

**Stack:** Next.js 16 (app router) · React 19 · TypeScript 5 · Tailwind v4 · shadcn/base-ui · Vitest 4 + Testing Library.

---

## Features

- Patient registration & list with full-text search
- Triage screen with vitals, allergies, NEWS2 score display, infection screening
- Consultation workspace: SOAP notes, ICD-11 diagnosis search, LOINC lab-order picker, imaging orders, prescriptions
- Laboratory / imaging result worklists with critical-result alerts
- Pharmacy: prescription queue, verification, dispensing, stock
- Admissions, ward & bed management, medication administration
- Billing with bill items, payments, insurance, waivers
- Realtime updates (WebSockets) for alerts and results
- System Admin console (`/system`): staff, roles/permissions matrix, departments, audit logs, reports, settings
- WCAG AA accessible, permission-gated navigation, clinical-green design system

## Docs

- `DESIGN.md` — design tokens and UI guidelines
- `PRODUCT.md` — product positioning

---

## CODE4CARE_EMR_FinalSubmission_2026 — Setup Guide

### Requirements

| Dependency | Minimum |
|---|---|
| Node.js | 20+ |
| npm | 10+ |

### 1. Clone and install

```bash
git clone git@github.com:ClinOps-EMR-System/clinops-emr-system-frontend.git
cd clinops-emr-system-frontend
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

> In production point `NEXT_PUBLIC_API_BASE_URL` at your deployed API, e.g. `https://clinops.dpdns.org/api`.

### 3. Run the app

```bash
npm run dev          # app at http://localhost:3000
npm run build        # production build
npm start            # run the production build
```

### 4. Run tests and lint

```bash
npm test             # 149+ Vitest + Testing Library tests
npm run lint         # ESLint
npx tsc --noEmit     # typecheck
```

### 5. Deploy on Vercel

1. Import this repository into Vercel (framework preset: Next.js).
2. Add the environment variables from step 2.
3. Deploy.

### Demo login credentials

The app talks to the seeded backend — use any staff account:

| Role | Email | Password |
|---|---|---|
| System Admin | `superadmin@musthospital.mw` | `superadmin1234` |
| Doctor (SMO) | `doctor@musthospital.mw` | `password` |
| Nurse (RNM) | `nurse@musthospital.mw` | `password` |
| Receptionist | `reception@musthospital.mw` | `password` |
| Lab Technician | `labtech@musthospital.mw` | `password` |
| Pharmacist | `pharmacist@musthospital.mw` | `password` |
| Radiographer | `radiographer@musthospital.mw` | `password` |
| Billing Officer | `billing@musthospital.mw` | `password` |
| Medical Student | `student@musthospital.mw` | `password` |

---

## Contributing

Follow `AGENTS.md`: read the installed Next.js docs (`node_modules/next/dist/docs/`) before writing code — this version has breaking changes vs public docs. Keep tests green, run ESLint and `tsc --noEmit` before committing.
