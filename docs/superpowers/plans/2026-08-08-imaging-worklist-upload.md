# Imaging Worklist Single-Step Results + Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a radiographer/radiologist upload scan images and type the report in one step from the Radiology Imaging Worklist, marking the request performed, saving, and releasing the report to clinicians — with multiple images supported.

**Architecture:** Backend adds an `imaging_result_images` table (multiple images per result) and extends the existing one-shot `POST /imaging-requests/{id}/complete` endpoint to accept an `images[]` array; the first image is mirrored into the existing `image_url` column so the realtime Postgres trigger keeps working. Frontend adds an "Upload Results" button + modal to the Requested/Performed tabs of `/radiology`, and the consultation `ImagingViewerModal` renders a gallery of all images.

**Tech Stack:** Laravel 13 / PHP 8.3 (Pest tests, OpenAPI yaml), Next.js 16 app router / React 19 / TypeScript 5 (Vitest 4, ESLint 9, base-ui/shadcn Modal + Button).

## Global Constraints

- Repos: backend `C:\Users\vamp2o5\Documents\Projects\ClinOps\ClinOps-EMR-System-backend` (branch `main`, clean), frontend `C:\Users\vamp2o5\Documents\Projects\ClinOps\clinops-emr-system-frontend` (branch `main`). Each task commits only in its own repo.
- Backend: thin controllers (no business logic), validation in Form Request classes, business logic in `app/Services`, responses via `ApiResponse` trait, eager-load relationships. PSR-12. New/changed endpoints must be reflected in `docs/openapi.yaml`.
- Backend verify: `composer test` (config:clear + artisan test, SQLite in-memory). Fast per-file check: `php artisan test --filter=ImagingWorkflow` run from the backend repo root.
- Frontend: read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code (the installed Next has breaking changes vs. public docs); heed deprecation notices.
- Frontend use existing components: `Modal` from `@/components/ui/Modal` (props `{ open, onClose, title, subtitle, children, size, footer }`), `Button` from `@/components/ui/button`. `api.post(endpoint, body, token)` already skips setting `Content-Type` when `body instanceof FormData`.
- Frontend tests: mock `@/lib/api` with `vi.hoisted` + `vi.mock`, matching `__tests__/lab-results-panel.test.tsx` style. `@testing-library/jest-dom` is auto-registered via `vitest.setup.ts`.
- Do not add code comments to new code.
- `git add` ONLY the files listed in each task — never `git add -A`.

---

### Task 1: Migration + `ImagingResultImage` model + relation

**Repo:** `ClinOps-EMR-System-backend`

**Files:**
- Create: `database/migrations/2026_08_09_000001_create_imaging_result_images_table.php`
- Create: `app/Models/ImagingResultImage.php`
- Modify: `app/Models/ImagingResult.php`

**Interfaces:**
- Consumes: existing `imaging_results` table.
- Produces:
  ```php
  // ImagingResultImage model, fillable: imaging_result_id, image_url, sort_order
  // ImagingResult::images(): HasMany — orderBy('sort_order')
  ```

- [ ] **Step 1: Create the migration**

Create `database/migrations/2026_08_09_000001_create_imaging_result_images_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('imaging_result_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('imaging_result_id')->constrained('imaging_results')->cascadeOnDelete();
            $table->string('image_url', 500);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('imaging_result_images');
    }
};
```

- [ ] **Step 2: Create the model**

Create `app/Models/ImagingResultImage.php`:

```php
<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImagingResultImage extends Model
{
    protected $fillable = [
        'imaging_result_id',
        'image_url',
        'sort_order',
    ];

    public function imagingResult(): BelongsTo
    {
        return $this->belongsTo(ImagingResult::class);
    }
}
```

- [ ] **Step 3: Update the `ImagingResult` model**

In `app/Models/ImagingResult.php`:
1. Add `'image_url'` to the `$fillable` array (currently only `imaging_request_id … released_at`).
2. Add the import `use Illuminate\Database\Eloquent\Relations\HasMany;` after the existing `BelongsTo` import.
3. Add the relationship method after `releasedBy()`:

```php
    public function images(): HasMany
    {
        return $this->hasMany(ImagingResultImage::class, 'imaging_result_id')->orderBy('sort_order');
    }
```

- [ ] **Step 4: Verify the migration runs clean**

Run: `php artisan test --filter=ImagingWorkflow`
Expected: all existing ImagingWorkflow tests PASS (RefreshDatabase runs the new migration).

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_08_09_000001_create_imaging_result_images_table.php app/Models/ImagingResultImage.php app/Models/ImagingResult.php
git commit -m "feat(imaging): add imaging_result_images table and relation"
```

---

### Task 2: Pest tests for multi-image completion

**Repo:** `ClinOps-EMR-System-backend`

**Files:**
- Modify: `tests/Feature/ImagingWorkflowTest.php`

**Interfaces:**
- Consumes: `Storage`, `UploadedFile` already imported at the top of the file.
- Produces (expected behavior):
  - `POST /api/imaging-requests/{id}/complete` with `images[]` (2 files) → 200, `data.status === "Released"`, `data.images` has 2 entries, 2 rows in `imaging_result_images`, result `image_url` equals first image URL.
  - `images.0` with a non-image mime → 422 with `images.0` validation error.

- [ ] **Step 1: Append the failing tests**

Append to the end of `tests/Feature/ImagingWorkflowTest.php`:

```php
it('completes a request with multiple images stored as separate rows', function () {
    Storage::fake('public');

    $request = ImagingRequest::create([
        'encounter_id' => $this->encounter->id,
        'imaging_type' => 'X-Ray',
        'body_site' => 'Chest',
        'status' => 'Requested',
        'requested_by' => $this->user->id,
    ]);

    $response = $this->withToken($this->token)
        ->post("/api/imaging-requests/{$request->id}/complete", [
            'findings' => 'Bilateral interstitial opacities.',
            'impression' => 'Possible viral pneumonia.',
            'images' => [
                UploadedFile::fake()->image('chest-pa.jpg', 400, 500),
                UploadedFile::fake()->image('chest-lat.jpg', 400, 500),
            ],
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'Released')
        ->assertJsonCount(2, 'data.images');

    $this->assertDatabaseCount('imaging_result_images', 2);
    $this->assertDatabaseHas('imaging_results', [
        'imaging_request_id' => $request->id,
        'image_url' => $response->json('data.images.0.image_url'),
    ]);
});

it('rejects an invalid file type inside the images array', function () {
    $request = ImagingRequest::create([
        'encounter_id' => $this->encounter->id,
        'imaging_type' => 'CT',
        'body_site' => 'Head',
        'status' => 'Performed',
        'requested_by' => $this->user->id,
        'performed_by' => $this->user->id,
        'performed_at' => now(),
    ]);

    $this->withToken($this->token)
        ->post("/api/imaging-requests/{$request->id}/complete", [
            'findings' => 'Findings.',
            'impression' => 'Impression.',
            'images' => [
                UploadedFile::fake()->create('report.pdf', 100, 'application/pdf'),
            ],
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors('images.0');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --filter=ImagingWorkflow`
Expected: the two new tests FAIL — the first fails on `assertDatabaseCount('imaging_result_images', 2)` (0 rows, no `images` rule accepted yet), the second gets 200 instead of 422 (no `images` rules exist).

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/ImagingWorkflowTest.php
git commit -m "test(imaging): cover multi-image completion and images validation"
```

---

### Task 3: Implement multi-image completion + eager-load `images`

**Repo:** `ClinOps-EMR-System-backend`

**Files:**
- Modify: `app/Http/Requests/CompleteImagingRequestRequest.php`
- Modify: `app/Services/ImagingService.php:99-103` (complete), `:210` (release load)
- Modify: `app/Http/Controllers/ImagingController.php:64` (show), `:171` (byEncounter)

**Interfaces:**
- Consumes: `ImagingResultImage` model + `ImagingResult::images()` relation (Task 1), `images` array in validated payload (this task).
- Produces:
  - `ImagingResult` responses (from `complete`, `show`, `byEncounter`, `release`) include `images: [{ id, image_url, sort_order }]`.
  - Legacy single `image` field still stored (as one `imaging_result_images` row) with `image_url` set.

- [ ] **Step 1: Add `images` validation**

In `app/Http/Requests/CompleteImagingRequestRequest.php`, add the two rules to `rules()` after the `image` rule:

```php
            'images'      => ['nullable', 'array', 'max:10'],
            'images.*'    => ['file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
```

- [ ] **Step 2: Update `ImagingService::complete()`**

In `app/Services/ImagingService.php`, replace the single-image block (currently `if (! empty($data['image'])) { … }`) with:

```php
            $files = $data['images'] ?? [];
            if (! empty($data['image'])) {
                $files[] = $data['image'];
            }

            if ($files) {
                $firstUrl = null;
                foreach ($files as $index => $uploaded) {
                    $path = $uploaded->store('imaging', 'public');
                    $url  = Storage::url($path);
                    if ($firstUrl === null) {
                        $firstUrl = $url;
                    }
                    $result->images()->create([
                        'image_url'  => $url,
                        'sort_order' => $index,
                    ]);
                }
                $result->update(['image_url' => $firstUrl]);
            }
```

- [ ] **Step 3: Eager-load `images` in the `release()` return**

In `app/Services/ImagingService.php`, change the `release()` return to:

```php
            return $imagingResult->fresh()->load(['reportedBy:id,name', 'releasedBy:id,name', 'images']);
```

- [ ] **Step 4: Eager-load `images` in the controller**

In `app/Http/Controllers/ImagingController.php`:
1. `show()`: append `'result.images'` to the `load([...])` call.
2. `byEncounter()`: append `'result.images'` to the `with([...])` call.

- [ ] **Step 5: Run the imaging tests**

Run: `php artisan test --filter=ImagingWorkflow`
Expected: ALL tests PASS, including the two new ones and the pre-existing `completes a requested imaging request with a report and image`.

- [ ] **Step 6: Run the full backend suite**

Run: `composer test`
Expected: full suite PASSES.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Requests/CompleteImagingRequestRequest.php app/Services/ImagingService.php app/Http/Controllers/ImagingController.php
git commit -m "feat(imaging): accept multiple images on complete and expose them in responses"
```

---

### Task 4: Worklist keeps completed uploads visible under Released

**Repo:** `ClinOps-EMR-System-backend`

**Files:**
- Modify: `app/Services/WorklistService.php:219-250`
- Modify: `tests/Feature/ImagingWorkflowTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GET /worklist/imaging` also returns `Completed` requests whose result is `Released`, so the worklist Released tab keeps showing single-step uploads (previously they vanished because `complete()` sets status to `Completed`).

- [ ] **Step 1: Add a failing test for the worklist**

Append to `tests/Feature/ImagingWorkflowTest.php`:

```php
it('includes completed requests with a released result in the imaging worklist', function () {
    $completed = ImagingRequest::create([
        'encounter_id' => $this->encounter->id,
        'imaging_type' => 'X-Ray',
        'body_site' => 'Chest',
        'status' => 'Completed',
        'requested_by' => $this->user->id,
        'performed_by' => $this->user->id,
        'performed_at' => now(),
    ]);

    ImagingResult::create([
        'imaging_request_id' => $completed->id,
        'findings' => 'Findings.',
        'impression' => 'Impression.',
        'status' => 'Released',
        'reported_by' => $this->user->id,
        'reported_at' => now(),
        'released_by' => $this->user->id,
        'released_at' => now(),
    ]);

    ImagingRequest::create([
        'encounter_id' => $this->encounter->id,
        'imaging_type' => 'Ultrasound',
        'body_site' => 'Abdomen',
        'status' => 'Requested',
        'requested_by' => $this->user->id,
    ]);

    $response = $this->withToken($this->token)
        ->getJson('/api/worklist/imaging')
        ->assertOk();

    $ids = collect($response->json('data'))->pluck('imaging_request_id');
    expect($ids)->toContain($completed->id);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --filter=ImagingWorkflow`
Expected: the new test FAILS (the completed request id is absent from `data`).

- [ ] **Step 3: Update the worklist query**

In `app/Services/WorklistService.php`, replace the query builder line:

```php
        $query = ImagingRequest::with(['encounter.patient', 'requestedBy:id,name', 'performedBy:id,name', 'result'])
            ->whereIn('status', ['Requested', 'Performed']);
```

with:

```php
        $query = ImagingRequest::with(['encounter.patient', 'requestedBy:id,name', 'performedBy:id,name', 'result'])
            ->where(function ($q) {
                $q->whereIn('status', ['Requested', 'Performed'])
                    ->orWhere(function ($q2) {
                        $q2->where('status', 'Completed')
                            ->whereHas('result', fn ($r) => $r->where('status', 'Released'));
                    });
            });
```

(Leave the `if ($statusFilter)` and the `->map(...)` below unchanged.)

- [ ] **Step 4: Run the imaging tests**

Run: `php artisan test --filter=ImagingWorkflow`
Expected: ALL pass, including the new worklist test.

- [ ] **Step 5: Run the full backend suite**

Run: `composer test`
Expected: full suite PASSES.

- [ ] **Step 6: Commit**

```bash
git add app/Services/WorklistService.php tests/Feature/ImagingWorkflowTest.php
git commit -m "feat(worklist): show completed imaging with released results under Released"
```

---

### Task 5: OpenAPI sync

**Repo:** `ClinOps-EMR-System-backend`

**Files:**
- Modify: `docs/openapi.yaml` (complete operation requestBody ~line 4377; `ImagingResult` schema ~line 4631)

**Interfaces:**
- Consumes: nothing.
- Produces: spec matches the implemented API (adds `images`, `image_url`, `images[]` schema).

- [ ] **Step 1: Add `images` to the complete request body**

In `docs/openapi.yaml`, inside `/imaging-requests/{imagingRequest}/complete` → `requestBody` → `multipart/form-data` → `schema` → `properties`, after the existing `image` property add:

```yaml
                images:
                  type: array
                  maxItems: 10
                  items:
                    type: string
                    format: binary
                  description: Scan image files (jpeg/png/gif/webp, max 10MB each)
```

- [ ] **Step 2: Add `image_url` and `images` to the `ImagingResult` schema**

In `docs/openapi.yaml`, in `components/schemas/ImagingResult`, after `impression` add:

```yaml
        image_url:
          type: string
          nullable: true
        images:
          type: array
          items:
            type: object
            properties:
              id:
                type: integer
              image_url:
                type: string
              sort_order:
                type: integer
```

- [ ] **Step 3: Sanity-check the YAML structure**

Run: `php -r "$y = yaml_parse_file('docs/openapi.yaml'); echo (isset($y['components']['schemas']['ImagingResult']) ? 'ok' : 'broken') . PHP_EOL;"`
Expected: prints `ok`. (If `yaml` PHP extension is missing, instead visually confirm the two edits indent at 8 spaces under `properties:`.)

- [ ] **Step 4: Commit**

```bash
git add docs/openapi.yaml
git commit -m "docs(openapi): document multi-image upload on complete"
```

---

### Task 6: Frontend types + viewer gallery

**Repo:** `clinops-emr-system-frontend`

**Files:**
- Modify: `types/imaging.ts`
- Modify: `components/consultation/ImagingViewerModal.tsx`

**Interfaces:**
- Consumes: backend responses now include `result.images` (Tasks 3).
- Produces:
  ```ts
  export interface ImagingResultImage { id: number; image_url: string; sort_order: number }
  // ImagingResult gains: images: ImagingResultImage[] | null
  ```

- [ ] **Step 1: Extend the types**

In `types/imaging.ts`, add before `export interface ImagingResult`:

```ts
export interface ImagingResultImage {
  id: number;
  image_url: string;
  sort_order: number;
}
```

Add to `ImagingResult` after `image_url: string | null;`:

```ts
  images: ImagingResultImage[] | null;
```

- [ ] **Step 2: Update `ImagingViewerModal` to render a gallery**

In `components/consultation/ImagingViewerModal.tsx`:
1. Replace the `const imageUrl = getPublicAssetUrl(result?.image_url ?? null);` line with:

```tsx
  const galleryImages =
    result?.images && result.images.length > 0
      ? result.images
      : result?.image_url
        ? [{ id: -1, image_url: result.image_url, sort_order: 0 }]
        : [];
```

2. Replace the single-image block inside the `{result && (…)}` section:

```tsx
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Scan Image{result && galleryImages.length > 1 ? `s (${galleryImages.length})` : ""}
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {galleryImages.map((img) => (
                <ResultImage
                  key={img.id}
                  url={getPublicAssetUrl(img.image_url)}
                  alt={`${imagingType ?? "Imaging"} scan${galleryImages.length > 1 ? ` — view ${img.sort_order + 1}` : ""}`}
                />
              ))}
            </div>
          </div>
```

(`getPublicAssetUrl` import stays; the old `imageUrl` variable is removed.)

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: production build succeeds with no type errors.

- [ ] **Step 4: Lint**

Run: `npx eslint "types/imaging.ts" "components/consultation/ImagingViewerModal.tsx"`
Expected: no errors.

- [ ] **Step 5: Run the frontend test suite**

Run: `npm test`
Expected: all existing tests PASS.

- [ ] **Step 6: Commit**

```bash
git add types/imaging.ts components/consultation/ImagingViewerModal.tsx
git commit -m "feat(imaging): add result images type and viewer gallery"
```

---

### Task 7: `ImagingUploadModal` component + tests

**Repo:** `clinops-emr-system-frontend`

**Files:**
- Create: `components/radiology/ImagingUploadModal.tsx`
- Test: `__tests__/imaging-upload-modal.test.tsx`

**Interfaces:**
- Consumes: `Modal` from `@/components/ui/Modal`, `Button` from `@/components/ui/button`, `api.post` from `@/lib/api`.
- Produces:
  ```ts
  export interface ImagingUploadTarget {
    imaging_request_id: number;
    imaging_type: string;
    body_site: string | null;
    patient: { full_name: string };
  }
  export default function ImagingUploadModal(props: {
    open: boolean;
    onClose: () => void;
    request: ImagingUploadTarget | null;
    token: string | null;
    onComplete?: () => void;
  }): JSX.Element
  ```
  Submits `POST /imaging-requests/{imaging_request_id}/complete` with a `FormData` containing `images[]` per selected file plus `findings`, `impression`, optional `technique`/`conclusion`, and `is_critical`.

- [ ] **Step 1: Write the failing test**

Create `__tests__/imaging-upload-modal.test.tsx`:

```tsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ImagingUploadModal from "../components/radiology/ImagingUploadModal";

const apiMock = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { post: apiMock.post } }));

const target = {
  imaging_request_id: 42,
  imaging_type: "X-Ray",
  body_site: "Chest",
  patient: { full_name: "Jane Doe" },
};

describe("ImagingUploadModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders title, subtitle, and the report fields", () => {
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);
    expect(screen.getByText("Upload Results & Images")).toBeInTheDocument();
    expect(screen.getByText(/X-Ray — Chest · Jane Doe/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the radiological findings/)).toBeInTheDocument();
  });

  it("disables submit until findings and impression are provided", () => {
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Upload Results & Release/ })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText(/Describe the radiological findings/), { target: { value: "F" } });
    fireEvent.change(screen.getByPlaceholderText(/Radiologist's diagnostic impression/), { target: { value: "I" } });
    expect(screen.getByRole("button", { name: /Upload Results & Release/ })).toBeEnabled();
  });

  it("submits a FormData with images[] and report fields", async () => {
    apiMock.post.mockResolvedValue({});
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);

    const file = new File(["img"], "chest.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText(/Click to select scan image files/), { target: { files: [file] } });

    fireEvent.change(screen.getByPlaceholderText(/Describe the radiological findings/), { target: { value: "Findings text" } });
    fireEvent.change(screen.getByPlaceholderText(/Radiologist's diagnostic impression/), { target: { value: "Impression text" } });
    fireEvent.click(screen.getByRole("button", { name: /Upload Results & Release/ }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledTimes(1));
    const [url, body] = apiMock.post.mock.calls[0];
    expect(url).toBe("/imaging-requests/42/complete");
    expect(body).toBeInstanceOf(FormData);
    expect(body.get("findings")).toBe("Findings text");
    expect(body.get("impression")).toBe("Impression text");
    expect(body.getAll("images[]")).toHaveLength(1);
  });

  it("shows a success message after a successful submit", async () => {
    apiMock.post.mockResolvedValue({});
    render(<ImagingUploadModal open request={target} token="t" onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/Describe the radiological findings/), { target: { value: "F" } });
    fireEvent.change(screen.getByPlaceholderText(/Radiologist's diagnostic impression/), { target: { value: "I" } });
    fireEvent.click(screen.getByRole("button", { name: /Upload Results & Release/ }));
    expect(await screen.findByText(/Report submitted and released/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- __tests__/imaging-upload-modal.test.tsx`
Expected: FAIL — cannot find module `../components/radiology/ImagingUploadModal`.

- [ ] **Step 3: Implement the component**

Create `components/radiology/ImagingUploadModal.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface ImagingUploadTarget {
  imaging_request_id: number;
  imaging_type: string;
  body_site: string | null;
  patient: { full_name: string };
}

interface ImagingUploadModalProps {
  open: boolean;
  onClose: () => void;
  request: ImagingUploadTarget | null;
  token: string | null;
  onComplete?: () => void;
}

export default function ImagingUploadModal({ open, onClose, request, token, onComplete }: ImagingUploadModalProps) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [technique, setTechnique] = useState("");
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setImages([]);
      setPreviews([]);
      setTechnique("");
      setFindings("");
      setImpression("");
      setConclusion("");
      setIsCritical(false);
      setError(null);
      setSuccess(null);
    }
  }, [open]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files).slice(0, 10 - images.length);
    setImages((prev) => [...prev, ...selected]);
    setPreviews((prev) => [...prev, ...selected.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !findings.trim() || !impression.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      images.forEach((file) => formData.append("images[]", file));
      formData.append("findings", findings);
      formData.append("impression", impression);
      if (technique.trim()) formData.append("technique", technique.trim());
      if (conclusion.trim()) formData.append("conclusion", conclusion.trim());
      formData.append("is_critical", String(isCritical));
      await api.post(`/imaging-requests/${request.imaging_request_id}/complete`, formData, token);
      setSuccess("Report submitted and released to the clinical team.");
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to upload results");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload Results & Images"
      subtitle={request ? `${request.imaging_type}${request.body_site ? ` — ${request.body_site}` : ""} · ${request.patient.full_name}` : ""}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {success ? "Close" : "Cancel"}
          </Button>
          {!success && (
            <Button onClick={handleSubmit} disabled={submitting || !findings.trim() || !impression.trim()}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Submitting..." : "Upload Results & Release"}
            </Button>
          )}
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {success && (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 font-medium">{success}</div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 font-medium">{error}</div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Scan Images <span className="text-muted-foreground font-normal normal-case">(optional, up to 10)</span>
          </label>
          <label
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input px-4 py-8 text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors",
              images.length > 0 && "hidden"
            )}
          >
            <ImagePlus className="h-6 w-6" />
            <span>Click to select scan image files (jpeg, png, gif, webp)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {previews.map((src, i) => (
                <div key={`${src}-${i}`} className="relative aspect-square rounded-lg border border-border overflow-hidden bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Scan ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
                <ImagePlus className="h-5 w-5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Technique <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <input
            type="text"
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
            value={technique}
            onChange={(e) => setTechnique(e.target.value)}
            placeholder="e.g. PA chest radiograph, supine"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Findings <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={4}
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Describe the radiological findings..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Impression <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
            value={impression}
            onChange={(e) => setImpression(e.target.value)}
            placeholder="Radiologist's diagnostic impression..."
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Conclusion / Recommendation <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <textarea
            rows={2}
            className="block w-full px-3 py-2 border border-input rounded-lg text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-y"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            placeholder="Follow-up recommendation..."
          />
        </div>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={isCritical}
            onChange={(e) => setIsCritical(e.target.checked)}
            className="rounded border-input text-red-600 focus:ring-red-500"
          />
          <span className="font-medium text-foreground">Mark as Critical Finding</span>
        </label>
      </form>
    </Modal>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- __tests__/imaging-upload-modal.test.tsx`
Expected: 4 tests PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint "components/radiology/ImagingUploadModal.tsx" "__tests__/imaging-upload-modal.test.tsx"`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/radiology/ImagingUploadModal.tsx __tests__/imaging-upload-modal.test.tsx
git commit -m "feat(radiology): add single-step results and image upload modal"
```

---

### Task 8: Wire "Upload Results" into the radiology worklist

**Repo:** `clinops-emr-system-frontend`

**Files:**
- Modify: `app/(app)/radiology/page.tsx`

**Interfaces:**
- Consumes: `ImagingUploadModal` + `ImagingUploadTarget` (Task 7).
- Produces: `Upload Results` primary button on Requested and Performed tab rows; modal opens, submits, and refreshes the worklist.

- [ ] **Step 1: Add imports**

In `app/(app)/radiology/page.tsx`, extend the lucide import line to add `ImagePlus`:

```tsx
import { ScanLine, Search, Clock, AlertTriangle, RefreshCw, FileText, ImagePlus } from "lucide-react";
```

Add after the `Modal` import:

```tsx
import ImagingUploadModal, { type ImagingUploadTarget } from "@/components/radiology/ImagingUploadModal";
```

- [ ] **Step 2: Add modal state + opener**

After the existing `const [selectedRequest, setSelectedRequest] = useState<ImagingRequest | null>(null);` add:

```tsx
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadRequest, setUploadRequest] = useState<ImagingUploadTarget | null>(null);
```

After the `closeReportModal` definition add:

```tsx
  const openUploadModal = (req: ImagingRequest) => {
    setUploadRequest({
      imaging_request_id: req.imaging_request_id,
      imaging_type: req.imaging_type,
      body_site: req.body_site,
      patient: req.patient,
    });
    setUploadModalOpen(true);
  };
```

- [ ] **Step 3: Add the button to the Requested tab actions**

In the Requested tab `TableCell` (Actions), replace the existing actions `div` so "Upload Results" comes first, "Mark Performed" becomes `variant="outline"`, and the Profile link stays:

```tsx
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => openUploadModal(req)}>
                            <ImagePlus className="h-3 w-3 mr-1" />
                            Upload Results
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPerformed(req)}
                          >
                            Mark Performed
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            nativeButton={false}
                            render={<Link href={`/patients/${req.patient.id}`} />}
                          >
                            Profile
                          </Button>
                        </div>
```

- [ ] **Step 4: Add the button to the Performed tab actions**

In the Performed tab `TableCell` (Actions), replace the existing actions `div` so "Upload Results" comes first, "Write/Edit Report" becomes `variant="outline"`, and the Release button stays when a draft exists:

```tsx
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => openUploadModal(req)}>
                            <ImagePlus className="h-3 w-3 mr-1" />
                            Upload Results
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openReportModal(req)}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            {req.has_draft_report ? "Edit Report" : "Write Report"}
                          </Button>
                          {req.has_draft_report && (
                            <Button
                              size="sm"
                              onClick={() => handleRelease(req)}
                            >
                              Release
                            </Button>
                          )}
                        </div>
```

- [ ] **Step 5: Render the modal**

After the closing `</Modal>` of the report modal (before the final `</div>`), add:

```tsx
      <ImagingUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        request={uploadRequest}
        token={token}
        onComplete={fetchData}
      />
```

- [ ] **Step 6: Typecheck + build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 7: Lint**

Run: `npx eslint "app/(app)/radiology/page.tsx"`
Expected: no errors.

- [ ] **Step 8: Run the frontend test suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/radiology/page.tsx"
git commit -m "feat(radiology): add Upload Results action to the imaging worklist"
```

---

### Task 9: Final verification

- [ ] **Step 1: Backend full suite**

In `ClinOps-EMR-System-backend`, run: `composer test`
Expected: full suite PASSES.

- [ ] **Step 2: Frontend full suite**

In `clinops-emr-system-frontend`, run: `npm test`
Expected: all tests PASS.

- [ ] **Step 3: Frontend lint**

In `clinops-emr-system-frontend`, run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Frontend production build**

In `clinops-emr-system-frontend`, run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual end-to-end check**

With backend (`php artisan serve` + queue) and frontend (`npm run dev`) running:

1. Open `/radiology` as a user with `imaging.report`. Place an imaging request from a consultation, or use an existing Requested row.
2. Click **Upload Results** on the row → select two image files → fill Findings + Impression → submit.
3. Confirm the row leaves Requested/Performed and appears under the **Released** tab.
4. Open the patient consultation → Radiology tab → **View Image & Report** → confirm both images render in the gallery with the report text.
5. Repeat with no images selected → report-only completion still works.

- [ ] **Step 6: Confirm working trees contain only intended files**

In both repos, run: `git status --short`
Expected: no unexpected modified files.

---

## Plan Self-Review

- **Spec coverage:** migration/model/relation (Task 1), backend multi-image tests (Task 2), request validation + service + eager-loads (Task 3), worklist Released visibility for completed uploads (Task 4 — plan-time refinement so single-step uploads don't vanish from the Released tab), OpenAPI sync (Task 5), frontend types + viewer gallery (Task 6), upload modal + tests (Task 7), radiology page wiring (Task 8), full verification incl. manual E2E (Task 9). The draft-flow non-goal, single-`image` backward compatibility, and DICOM exclusion from the spec are respected.
- **Placeholder scan:** no TBD/TODO; every code step has concrete code.
- **Type consistency:** `ImagingResult.images: ImagingResultImage[] | null` (Task 6) matches backend `images` payload (Tasks 3/5); `ImagingUploadTarget` fields (`imaging_request_id`, `imaging_type`, `body_site`, `patient.full_name`) defined in Task 7 are used verbatim in Task 8; `api.post(endpoint, formData, token)` matches `lib/api.ts` behavior; `UploadedFile::fake()` usage matches existing tests; the `images` validation key names match between Task 2 tests and Task 3 request rules.
