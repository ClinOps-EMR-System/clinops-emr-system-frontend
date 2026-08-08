# Imaging Worklist Single-Step Results + Image Upload — Design

Date: 2026-08-08
Status: Approved (approach + design signed off by user)
Repos: `clinops-emr-system-frontend` + `ClinOps-EMR-System-backend`

## Goal

From the Radiology Imaging Worklist (`/radiology`, sidebar → Services →
Radiology), a radiographer/radiologist can upload scan images **and** type the
report in a single step. Submitting marks the request as performed, saves the
report, and releases it to clinicians immediately. Multiple images per request
are supported.

## Scope

In scope:

- Backend: multiple images per imaging result (new table + model + relationship).
- Backend: `complete` endpoint accepts an `images` array (legacy single `image`
  still accepted).
- Frontend: "Upload Results" button + modal on the Requested and Performed tabs
  of `/radiology`.
- Frontend: consultation `ImagingViewerModal` shows all uploaded images.
- Tests + OpenAPI sync for the backend change.

Out of scope:

- Editing/replacing images on an already-released report.
- Image upload in the separate 3-step draft flow (`/result` + `/release`).
- DICOM support (browser viewer is `img`-based; jpeg/jpg/png/gif/webp only).
- Removing an individual image from a result.

## Backend

### 1. Migration — `imaging_result_images` table

Columns: `id`, `imaging_result_id` (FK → `imaging_results`, cascadeOnDelete),
`image_url` (string 500), `sort_order` (integer, default 0), `created_at`,
`updated_at`.

### 2. Model — `App\Models\ImagingResultImage`

- `belongsTo(ImagingResult::class)`.
- `$fillable`: `imaging_result_id`, `image_url`, `sort_order`.

### 3. `App\Models\ImagingResult` (modify)

- Add `hasMany(ImagingResultImage::class, 'imaging_result_id')->orderBy('sort_order')`.
- Add `image_url` to `$fillable` (currently absent).

### 4. `App\Services\ImagingService::complete()` (modify)

- Accept `images` array (files) alongside legacy `image` file.
- Store each file to `storage/app/public/imaging` via `->store('imaging', 'public')`.
- Insert one `ImagingResultImage` row per file (incrementing `sort_order`).
- Set the result's `image_url` to the **first** image's URL so the existing
  realtime Postgres trigger (`trg_radiology_results_broadcast`) and legacy
  viewer continue to work.
- Existing behavior (mark performed, save/update draft, release, critical
  alert, encounter state machine) unchanged.

### 4b. Eager-load `images` in API responses

- `ImagingController::complete()` response: `$imagingRequest->result` should
  include `images`.
- `ImagingController::show()` and `byEncounter()`: load `result.images`
  alongside the existing `result.reportedBy`/`result.releasedBy` so the
  consultation viewer receives the gallery.

### 5. `CompleteImagingRequestRequest` (modify)

Add:

```php
'images' => ['nullable', 'array', 'max:10'],
'images.*' => ['file', 'mimes:jpeg,jpg,png,gif,webp', 'max:10240'],
```

Keep existing `image` single-file rule. `complete()` maps the first of
`images`/`image` into the payload.

### 6. OpenAPI — `docs/openapi.yaml`

Add `images` multipart field to the complete-operation request body; add
`images: [{ id, image_url, sort_order }]` to the `ImagingResult` schema.

### 7. Tests — `tests/Feature/ImagingWorkflowTest.php`

- Completing with multiple `images` stores each row in `imaging_result_images`
  and sets the result `image_url` to the first.
- Completing with an invalid image type in `images.*` → 422.
- Existing single-`image` complete test keeps passing.

## Frontend

### 1. `types/imaging.ts` (modify)

Add to `ImagingResult`:

```ts
images: { id: number; image_url: string; sort_order: number }[] | null;
```

### 2. `app/(app)/radiology/page.tsx` (modify)

- Add `"Upload Results"` as the primary action on rows in the **Requested** and
  **Performed** tabs. Keep "Mark Performed" (Requested) and "Write Report /
  Release" (Performed) as secondary.
- New `ImagingUploadModal` state: `uploadModalOpen`, `selectedRequest`,
  `uploadForm { images: File[], technique, findings, impression, conclusion, is_critical }`,
  `submitting`, `submitError`, `submitSuccess`.
- Submit builds `FormData` (`images` entries, plus fields) and
  `api.post('/imaging-requests/{id}/complete', formData, token)` (the api layer
  already skips `Content-Type` for `FormData`).
- On success: close modal, `fetchData()`, show success toast/message.

### 3. `components/consultation/ImagingViewerModal.tsx` (modify)

- Replace the single `ResultImage` with a gallery: render each image in
  `result.images` (falling back to legacy `image_url` as a single-item array).
- Each image keeps the existing black-box + loader + `getPublicAssetUrl()`
  treatment.

## Data flow

Click **Upload Results** → modal (image picker + findings/impression) →
multipart `POST /imaging-requests/{id}/complete` → `ImagingService::complete()`
(store files, mark performed, save report, release, critical alert) →
worklist refresh. Clinicians see image gallery + report via the consultation
`ImagingViewerModal` (loaded from `GET /encounters/{id}/imaging`).

## Error handling

- No image selected → allowed (report-only completion), matching current `image`
  optionality.
- Invalid/oversized file → 422 from Laravel, surfaced as `submitError`.
- `complete` on Cancelled request → 422 (existing controller guard).
- Image storage failure → exception bubbles as API error.

## Testing / verification

Backend:

- `composer test` — new + existing tests pass.
- OpenAPI spec updated.

Frontend:

- `npm test` — existing tests keep passing.
- `npm run lint` clean.
- `npm run build` (typechecks) passes.
- Read the relevant guide in `node_modules/next/dist/docs/` before writing
  Next.js code (installed Next has breaking changes vs. public docs); heed
  deprecation notices.

## Non-goals (kept out intentionally)

- No image editing/replacement after release.
- No upload in the draft (`/result`) flow — the single-step `complete` flow is
  the easy path.
- No DICOM.
- No per-image deletion.
