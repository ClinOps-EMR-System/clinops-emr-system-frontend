# Billable Services Catalog Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the services catalog page so admins can see and price the five auto-billed services at a glance and pick lab tests from a LOINC dropdown instead of remembering exact names/codes.

**Architecture:** Frontend-only (no backend changes). Two additions to `app/(admin)/system/catalogs/services/page.tsx`: (1) an "Auto-billed" quick-view panel above the existing table that matches the five seeded services (`CONS-OPD`, `CONS-EMG`, `CONS-INP`, `ADM-FEE`, `DIS-FEE`) by code, shows each with an inline price input, and saves via the existing `PUT /services/{id}` / `POST /services` endpoints (creating the record when missing); (2) a LOINC picker in the New/Edit modal shown when the category is `Lab`, backed by the existing `GET /loinc/search?q=` endpoint, which auto-fills `name` (LOINC display_name), `code` (`LAB-<loinc code>`), and `category` (`Lab`). Pure matching logic lives in a new tested module `lib/billing/catalog.ts`.

**Tech Stack:** Next.js 16, React 19, TypeScript, lucide-react, @base-ui/react, vitest + @testing-library/react

## Global Constraints

- No backend changes; reuse existing endpoints `GET /api/services`, `POST /api/services`, `PUT /api/services/{id}`, `GET /loinc/search?q=` (LOINC returns a **raw JSON array**, not the ApiResponse envelope — do not unwrap).
- Seeded auto-billed codes are `CONS-OPD`, `CONS-EMG`, `CONS-INP`, `ADM-FEE`, `DIS-FEE`. Categories must stay `Consultation`/`Misc` — do not change.
- The auto-billed panel must be populated from an **unfiltered** `GET /api/services` fetch (no `search`/`category` params) so the five seeds are always present even when the table is filtered; this is a deliberate deviation from the design's "same load" wording to avoid spurious Create buttons (which would fail with 422 duplicate-code).
- LOINC matching: billing resolves by `name` + `category` (`Lab`). The LOINC picker exists only to auto-fill fields — manual name/code/category editing stays fully available.
- Editing/saving controls require `catalog.manage` (existing `canManage` gate). Read-only price display otherwise.
- Follow existing page patterns: `can` from `usePermissions`, `token` from `useAuth`, error via the page-level red banner, `adminApi` from `@/lib/services/admin`, inputs from `@/components/ui/input`, `Modal` from `@/components/ui/Modal`, table from `@/components/ui/table`.
- Commits per task on the current `billing` branch. Run `npx tsc --noEmit` and `npm run test` before considering work complete.

---

### Task 1: `LoincCode` type + `searchLoinc` API method

**Files:**
- Modify: `types/admin.ts` (add `LoincCode` interface after `BillableService`)
- Modify: `lib/services/admin/index.ts` (add `searchLoinc` method + `LoincCode` import)

**Interfaces:**
- Consumes: existing `api` client from `@/lib/api`, existing import block in `lib/services/admin/index.ts`
- Produces: `interface LoincCode { code: string; display_name: string; component_name?: string | null; system?: string | null }` and `adminApi.searchLoinc(token: string | null, q: string): Promise<LoincCode[]>` — used by Task 4

- [ ] **Step 1: Add the `LoincCode` interface**

In `types/admin.ts`, directly after the `BillableService` interface (after line 58), add:

```ts
export interface LoincCode {
  code: string;
  display_name: string;
  component_name?: string | null;
  system?: string | null;
}
```

- [ ] **Step 2: Add `LoincCode` to the admin API imports**

In `lib/services/admin/index.ts`, add `LoincCode` to the existing `import type { ... } from "@/types/admin"` block:

```ts
import type {
  AdminOverview,
  AdminPermission,
  AdminRole,
  AdminUser,
  AuditLogEntry,
  BillableService,
  Department,
  HospitalSettings,
  LoincCode,
  Ward,
} from "@/types/admin";
```

- [ ] **Step 3: Add the `searchLoinc` method**

In `lib/services/admin/index.ts`, add the method after `deleteService` (after line 197):

```ts
  searchLoinc: async (token: string | null, q: string) =>
    (await api.get(`/loinc/search?q=${encodeURIComponent(q)}`, token)) as LoincCode[],
```

Note: no `unwrap` — the LOINC endpoint returns a raw array.

- [ ] **Step 4: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add types/admin.ts lib/services/admin/index.ts
git commit -m "feat: add LoincCode type and searchLoinc API method"
```

---

### Task 2: Pure catalog helpers with unit tests

**Files:**
- Create: `lib/billing/catalog.ts`
- Test: `__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: `BillableService`, `LoincCode` from `@/types/admin` (Task 1)
- Produces:
  - `export interface AutoBilledSeed { code: string; name: string; category: string }`
  - `export const AUTO_BILLED_SERVICES: AutoBilledSeed[]` (5 entries, seed order)
  - `export interface AutoBilledRow { seed: AutoBilledSeed; service: BillableService | null }`
  - `export function resolveAutoBilled(items: BillableService[]): AutoBilledRow[]` — one row per seed in seed order, `service` matched by code or `null`
  - `export function loincToServiceFields(loinc: LoincCode): { code: string; name: string; category: string }` — `code: "LAB-"+loinc.code`, `name: loinc.display_name`, `category: "Lab"`
  - Used by Task 3 (panel) and Task 4 (modal)

- [ ] **Step 1: Write the failing test**

Create `__tests__/catalog.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  AUTO_BILLED_SERVICES,
  loincToServiceFields,
  resolveAutoBilled,
} from "../lib/billing/catalog";
import type { BillableService, LoincCode } from "../types/admin";

function service(code: string, name: string, category: string): BillableService {
  return { id: 1, code, name, category, unit_price: 0 };
}

describe("resolveAutoBilled", () => {
  it("returns one row per seeded service, in seed order", () => {
    const rows = resolveAutoBilled([]);
    expect(rows).toHaveLength(AUTO_BILLED_SERVICES.length);
    expect(rows.map((r) => r.seed.code)).toEqual(AUTO_BILLED_SERVICES.map((s) => s.code));
  });

  it("matches loaded services to seeds by code", () => {
    const rows = resolveAutoBilled([
      service("CONS-OPD", "OPD Consultation", "Consultation"),
      service("ADM-FEE", "Admission Fee", "Misc"),
    ]);
    expect(rows.find((r) => r.seed.code === "CONS-OPD")?.service).not.toBeNull();
    expect(rows.find((r) => r.seed.code === "ADM-FEE")?.service).not.toBeNull();
  });

  it("sets service to null for seeds missing from the loaded list", () => {
    const rows = resolveAutoBilled([]);
    expect(rows.find((r) => r.seed.code === "CONS-OPD")?.service).toBeNull();
  });
});

describe("loincToServiceFields", () => {
  it("maps a LOINC result to LAB-<code>, display_name, and Lab category", () => {
    const loinc: LoincCode = {
      code: "718-7",
      display_name: "Hemoglobin",
      component_name: "Hgb",
      system: "Bld",
    };
    expect(loincToServiceFields(loinc)).toEqual({
      code: "LAB-718-7",
      name: "Hemoglobin",
      category: "Lab",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/catalog.test.ts`
Expected: FAIL (module `../lib/billing/catalog` cannot be resolved).

- [ ] **Step 3: Write the implementation**

Create `lib/billing/catalog.ts`:

```ts
import type { BillableService, LoincCode } from "@/types/admin";

export interface AutoBilledSeed {
  code: string;
  name: string;
  category: string;
}

export const AUTO_BILLED_SERVICES: AutoBilledSeed[] = [
  { code: "CONS-OPD", name: "OPD Consultation", category: "Consultation" },
  { code: "CONS-EMG", name: "Emergency Consultation", category: "Consultation" },
  { code: "CONS-INP", name: "Inpatient Consultation", category: "Consultation" },
  { code: "ADM-FEE", name: "Admission Fee", category: "Misc" },
  { code: "DIS-FEE", name: "Discharge Fee", category: "Misc" },
];

export interface AutoBilledRow {
  seed: AutoBilledSeed;
  service: BillableService | null;
}

export function resolveAutoBilled(items: BillableService[]): AutoBilledRow[] {
  const byCode = new Map(items.map((s) => [s.code, s]));
  return AUTO_BILLED_SERVICES.map((seed) => ({
    seed,
    service: byCode.get(seed.code) ?? null,
  }));
}

export function loincToServiceFields(loinc: LoincCode): {
  code: string;
  name: string;
  category: string;
} {
  return {
    code: `LAB-${loinc.code}`,
    name: loinc.display_name,
    category: "Lab",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/catalog.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Verify typecheck + full suite**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc clean; 66 tests pass (62 existing + 4 new).

- [ ] **Step 6: Commit**

```bash
git add lib/billing/catalog.ts __tests__/catalog.test.ts
git commit -m "feat: add auto-billed service resolution and LOINC field mapping helpers"
```

---

### Task 3: Auto-billed quick-view panel

**Files:**
- Modify: `app/(admin)/system/catalogs/services/page.tsx`

**Interfaces:**
- Consumes: `AUTO_BILLED_SERVICES` (not directly — only via `resolveAutoBilled`), `resolveAutoBilled`, `AutoBilledRow` from `@/lib/billing/catalog` (Task 2); existing `adminApi.listServices/updateService/createService`, existing `canManage` gate, existing `load()`, existing `token`
- Produces: page-level panel rendering the five seeded services with inline price inputs + Save (or Create when missing); an `autoItems` state fed by an unfiltered `loadAuto()`; `priceDrafts` state; `saveAutoPrice()` handler

- [ ] **Step 1: Add imports**

In `app/(admin)/system/catalogs/services/page.tsx`, add these two import lines after the existing imports:

```tsx
import { resolveAutoBilled } from "@/lib/billing/catalog";
import type { AutoBilledRow } from "@/lib/billing/catalog";
```

The page already imports `BillableService` from `@/types/admin` (used by the new `autoItems` state); no change to that line.

- [ ] **Step 2: Add auto-panel state**

After the existing `form` state (after line 40), add:

```tsx
  const [autoItems, setAutoItems] = useState<BillableService[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const autoRows = resolveAutoBilled(autoItems);
```

- [ ] **Step 3: Add the unfiltered loader + price save handler**

After the existing `remove` function (after line 124), add:

```tsx
  const loadAuto = useCallback(async () => {
    try {
      const res = await adminApi.listServices(token);
      setAutoItems(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load auto-billed services");
    }
  }, [token]);

  const saveAutoPrice = async (row: AutoBilledRow) => {
    const price = Number(priceDrafts[row.seed.code] ?? row.service?.unit_price ?? 0) || 0;
    setSavingCode(row.seed.code);
    try {
      if (row.service) {
        await adminApi.updateService(token, row.service.id, {
          code: row.service.code,
          name: row.service.name,
          category: row.service.category || null,
          unit_price: price,
        });
      } else {
        await adminApi.createService(token, {
          code: row.seed.code,
          name: row.seed.name,
          category: row.seed.category,
          unit_price: price,
        });
      }
      setPriceDrafts((d) => ({ ...d, [row.seed.code]: String(price) }));
      await Promise.all([loadAuto(), load()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingCode(null);
    }
  };
```

- [ ] **Step 4: Load the auto panel on mount**

In the existing token-hydration `useEffect` (lines 70-80), change the timeout body so both loads run:

```tsx
    if (token) {
      const t = setTimeout(() => {
        void load();
        void loadAuto();
      }, 0);
      return () => clearTimeout(t);
    }
```

Keep the `// eslint-disable-next-line react-hooks/exhaustive-deps` comment as-is (it already covers this effect).

- [ ] **Step 5: Render the panel above the table**

Between the error banner block (ends around line 188) and the table card (starts line 190), insert:

```tsx
      <div className="rounded-lg border border-[var(--outline)] bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold">Auto-billed services</h2>
          <p className="mt-0.5 text-xs text-[var(--clinical-muted)]">
            Prices applied automatically at consultation, admission and discharge.
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {autoRows.map((row) => {
              const draft =
                priceDrafts[row.seed.code] ??
                (row.service ? String(row.service.unit_price) : "0");
              return (
                <TableRow key={row.seed.code}>
                  <TableCell className="font-mono text-xs">{row.seed.code}</TableCell>
                  <TableCell className="font-medium">{row.seed.name}</TableCell>
                  <TableCell>{row.seed.category}</TableCell>
                  <TableCell className="text-right">
                    {canManage ? (
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="ml-auto h-8 w-28 text-right"
                        value={draft}
                        onChange={(e) =>
                          setPriceDrafts((d) => ({
                            ...d,
                            [row.seed.code]: e.target.value,
                          }))
                        }
                      />
                    ) : (
                      <span className="tabular-nums">{Number(draft).toFixed(2)}</span>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingCode === row.seed.code}
                        onClick={() => void saveAutoPrice(row)}
                      >
                        {row.service ? "Save" : "Create"}
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
```

- [ ] **Step 6: Verify typecheck + full suite**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc clean; 66 tests pass.

- [ ] **Step 7: Commit**

```bash
git add "app/(admin)/system/catalogs/services/page.tsx"
git commit -m "feat: add auto-billed services quick-view panel to catalog"
```

---

### Task 4: LOINC dropdown in the New/Edit modal

**Files:**
- Modify: `app/(admin)/system/catalogs/services/page.tsx`

**Interfaces:**
- Consumes: `LoincCode` type (Task 1), `adminApi.searchLoinc` (Task 1), `loincToServiceFields` (Task 2), existing `form`/`setForm`/`open`/`setOpen`/`editing` state, existing `Modal`
- Produces: a LOINC search section inside the modal shown when `form.category` is `Lab`, and `applyLoinc(loinc)` which auto-fills name/code/category; `loincQuery`/`loincResults`/`loincLoading`/`loincSearched` state with a 300ms debounce

- [ ] **Step 1: Add LOINC state**

First, extend the imports in `app/(admin)/system/catalogs/services/page.tsx`:

```tsx
import { loincToServiceFields, resolveAutoBilled } from "@/lib/billing/catalog";
```

and add `LoincCode` to the existing `import type { BillableService } from "@/types/admin";` line:

```tsx
import type { BillableService, LoincCode } from "@/types/admin";
```

Then, after the auto-panel state added in Task 3 (Step 2), add:

```tsx
  const [loincQuery, setLoincQuery] = useState("");
  const [loincResults, setLoincResults] = useState<LoincCode[]>([]);
  const [loincLoading, setLoincLoading] = useState(false);
  const [loincSearched, setLoincSearched] = useState(false);
```

- [ ] **Step 2: Add the debounced search effect + apply handler**

After the `saveAutoPrice` function added in Task 3 (Step 3), add:

```tsx
  useEffect(() => {
    if (form.category?.toLowerCase() !== "lab" || loincQuery.trim().length < 2) {
      setLoincResults([]);
      setLoincSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoincLoading(true);
      try {
        const results = await adminApi.searchLoinc(token, loincQuery.trim());
        setLoincResults(results);
        setLoincSearched(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "LOINC search failed");
        setLoincResults([]);
        setLoincSearched(true);
      } finally {
        setLoincLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category, loincQuery, token]);

  const applyLoinc = (loinc: LoincCode) => {
    const fields = loincToServiceFields(loinc);
    setForm((f) => ({ ...f, ...fields }));
    setLoincQuery("");
    setLoincResults([]);
    setLoincSearched(false);
  };
```

- [ ] **Step 3: Reset LOINC state when opening the modal**

In `openCreate` (lines 82-86), after `setOpen(true);` add:

```tsx
    setLoincQuery("");
    setLoincResults([]);
    setLoincSearched(false);
```

In `openEdit` (lines 88-97), after `setOpen(true);` add the same three lines.

- [ ] **Step 4: Render the LOINC picker in the modal**

Inside the `<Modal>` (line 249), immediately after the opening `<div className="space-y-3">` (line 254), insert:

```tsx
          {form.category?.toLowerCase() === "lab" && (
            <div className="space-y-1 rounded-md border border-gray-200 bg-gray-50 p-3">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Pick a lab test</span>
                <Input
                  value={loincQuery}
                  onChange={(e) => setLoincQuery(e.target.value)}
                  placeholder="Search LOINC code or name…"
                />
              </label>
              {loincLoading ? (
                <p className="text-xs text-gray-400">Searching…</p>
              ) : loincSearched && loincResults.length === 0 ? (
                <p className="text-xs text-gray-400">No matches.</p>
              ) : (
                loincResults.length > 0 && (
                  <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200 bg-white">
                    {loincResults.map((loinc) => (
                      <li key={loinc.code}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                          onClick={() => applyLoinc(loinc)}
                        >
                          <span className="truncate">{loinc.display_name}</span>
                          <span className="shrink-0 font-mono text-xs text-gray-400">
                            {loinc.code}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>
          )}
```

- [ ] **Step 5: Verify typecheck + full suite**

Run: `npx tsc --noEmit && npm run test`
Expected: tsc clean; 66 tests pass.

- [ ] **Step 6: Commit**

```bash
git add "app/(admin)/system/catalogs/services/page.tsx"
git commit -m "feat: add LOINC picker to lab service modal in catalog"
```

---

### Task 5: Final verification

**Files:**
- Read-only: `app/(admin)/system/catalogs/services/page.tsx`, `lib/billing/catalog.ts`, `lib/services/admin/index.ts`, `types/admin.ts`

**Interfaces:**
- Verifies the whole feature end-to-end (tasks 1-4)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npm run test`
Expected: 66 tests pass (62 existing + 4 new in `catalog.test.ts`).

- [ ] **Step 3: Review the final page against the design spec**

Open `docs/superpowers/specs/2026-08-03-billable-services-catalog-design.md` and confirm, by reading the code in `page.tsx`:
- The auto-billed panel lists the five seeded services by code with inline price inputs and Save buttons (or Create when missing), gated by `canManage`.
- The panel uses an unfiltered `listServices(token)` fetch (`loadAuto`) independent of the table's search/category filters.
- The modal shows the LOINC picker when the category is `Lab`; picking a result auto-fills name/code (`LAB-<code>`)/category (`Lab`); manual fields remain editable; duplicate code on manual entry surfaces the existing 422 error.
- No backend routes, migrations, or payload changes were introduced.

- [ ] **Step 4: Confirm clean git state and commit history**

Run: `git status --short` (nothing uncommitted) and `git log --oneline -6` (five feature commits from Tasks 1-4).

**Done — feature complete.**
