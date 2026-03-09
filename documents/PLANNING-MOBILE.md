# Mobile App Planning (Mohtawa)

**Scope:** React Native (Expo) app — mobile version of the **same product** as the web app. Mirror feature structure, data shapes, API contracts, and UX; adapt UI for mobile only where necessary.  
**Last updated:** March 2026 — **Done:** Full parity (see §14): Shared layer, auth, Projects, Runs, Review Queue, EDL Editor (basic: load/save/render/preview), Settings, Voice Profiles, Ideas Editor (Markdown + JSON), Import footage, Iteration detail, Workflow detail, Run logs view, Builder Option A (mobile canvas) **with full parity** (edges, TopBar, Run + logs, Inspector, node cards, tap-to-place, zoom, search, long-press delete, open EDL from builder). Web frontend wired to `@mohtawa/shared` with runtime validation (§16). **Planned:** Full EDL/video editor parity (timeline, trim, reorder, overlays, audio, color, export options) — see **§18**.

---

## Table of Contents

0. [Full Web App Scan & Parity Plan](#0-full-web-app-scan--parity-plan)
1. [High-Level Objective](#1-high-level-objective)
2. [Architecture Requirements](#2-architecture-requirements)
3. [Mobile UI Scope](#3-mobile-ui-scope)
4. [UX Principles](#4-ux-principles)
5. [Feature Mapping (Web → Mobile)](#5-feature-mapping-web--mobile)
6. [Technical Mobile Stack](#6-technical-mobile-stack)
7. [Implementation Strategy](#7-implementation-strategy)
8. [Deliverables](#8-deliverables)
9. [Constraints](#9-constraints)
10. [What to Do Now](#10-what-to-do-now)
11. [Feature Spec: Import Footage](#11-feature-spec-import-footage)
12. [Feature Spec: Review Queue](#12-feature-spec-review-queue)
13. [What to Update / Change](#13-what-to-update--change)
14. [Mobile Roadmap](#14-mobile-roadmap)
15. [Summary: Shared vs Mobile-Specific vs Backend](#15-summary-shared-vs-mobile-specific-vs-backend)
16. [What to Do Next](#16-what-to-do-next)
17. [Mobile Builder vs Web: Gaps](#17-mobile-builder-vs-web-gaps)
18. [Mobile EDL / Video Editor Parity Plan](#18-mobile-edl--video-editor-parity-plan)  
    - [18.10 Mobile video editor: modern UX refactor (reference design)](#1810-mobile-video-editor-modern-ux-refactor-reference-design)  
    - [18.10.18 Implementation status (§18.10)](#181018-implementation-status-1810-modern-ux-refactor)
    - [18.10.19 Layout spacing: Timeline ↔ Bottom toolbar](#181019-layout-spacing-timeline--bottom-toolbar-fix)
    - [18.10.20 Video import and timeline thumbnail UX](#181020-video-import-and-timeline-thumbnail-ux)
    - [18.10.21 Add new video clip UX (loading popup + floating add button)](#181021-add-new-video-clip-ux-loading-popup--floating-add-button)

---

## 0. Full Web App Scan & Parity Plan

This section is the result of a full scan of the web frontend (`frontend/`). It defines how to make the mobile app **exactly similar** to the web app in structure, features, and data.

### 0.1 Web routes and protection

| Route | Component | Protected | Notes |
|-------|-----------|-----------|--------|
| `/login` | Login | No | |
| `/register` | Register | No | |
| `/` | Dashboard | Yes | Workflows list (home) |
| `/builder/:id` | Builder | Yes | Workflow canvas + inspector + EDL editor |
| `/settings` | Settings | Yes | API keys, theme |
| `/voice-profiles` | VoiceProfiles | Yes | Voice clone list, create, upload, train |
| `/editor` | IdeasEditor | Yes | Ideas & Scripts (Tiptap docs) |
| `*` | NotFound | No | |

All protected routes sit under a single `ProtectedRoute` wrapper (auth check + redirect to `/login`).

### 0.2 Web pages summary

- **Dashboard:** Workflow list with search, filter (all / draft / active), “New Workflow”, cards with name, description, status badge, last edited, node count. Per-card menu: Open, Duplicate, Delete. Header: user menu (Ideas & Scripts → `/editor`, Voice profiles → `/voice-profiles`, Settings → `/settings`, Sign out). Theme toggle. Navigate to Builder on card click or Open.
- **Builder:** Load workflow by `id`; TopBar (back to `/`, node library toggle, workflow name + status + save status, Undo/Redo, workflow settings, theme, **Run**); NodeLibrary (desktop: side panel; mobile: Sheet left); FlowCanvas (React Flow); InspectorPanel (desktop: right panel; mobile: Sheet when node selected). Inspector has tabs: **Config** (NodeConfigForm for selected node), **Queue** (ReviewQueuePanel when selected node is review node), **Logs** (RunLogs). EDL editor opened via `onOpenEdlEditor(projectId)` from NodeConfigForm or ReviewQueuePanel “Edit” → portal to `document.body`. CommandPalette (Ctrl+K); WorkflowMetaDialog (name, description, status).
- **Settings:** List API keys (service, label, masked); Add key (service select: OpenAI, Anthropic, ElevenLabs, Google TTS, Meta, TikTok, YouTube); Delete key; theme toggle; back to Dashboard.
- **Voice Profiles:** List profiles; create (name, provider, voice ID, language); select profile → detail; upload assets (file + optional duration); train clone; user menu + theme.
- **Ideas Editor:** Sidebar: list of idea docs + trash; Tiptap editor; create, load, update, delete, restore; autosave; “Ideas & Scripts” product name; link back to Dashboard.

### 0.3 Builder deep-dive (web)

- **TopBar:** Back, Node library toggle, editable workflow name, status badge, save status, Undo, Redo, Workflow settings, Theme, **Run** (triggers `runWorkflow()`).
- **NodeLibrary / NodeLibraryContent:** Node categories and definitions; add node to canvas; on mobile rendered in Sheet (left).
- **FlowCanvas:** React Flow canvas; nodes and edges; select node → Inspector shows Config.
- **InspectorPanel:** Tabs: **Config** (NodeConfigForm), **Queue** (only if selected node is `review.approval_gate`), **Logs** (RunLogs). Queue tab shows ReviewQueuePanel with `runId` from `runLog` or `lastCompletedRunLog`. On mobile: Sheet (right), opens when a node is selected; closing sheet clears selection.
- **NodeConfigForm:** Renders form for selected node’s config; can open EDL editor via `onOpenEdlEditor(projectId)` where applicable.
- **ReviewQueuePanel:** Header: workflow name, total items, status badges (needs review, approved, rendered, skipped, failed), search. Tabs: All, Needs review, Approved, Rendered, Skipped, Failed. List of items: thumbnail (draft video), title, status badge, error if failed; actions: **Regenerate** (failed only), **Edit** (opens EDL editor with `item.projectId`). Uses `runsApi.getReviewQueue(runId)`, `runsApi.regenerateDraft(runId, iterationId)`. *Note: Web panel does not show Approve/Skip in row; those exist in API as `runsApi.decideReview`. Mobile may expose Approve/Skip in queue for parity with product language.*
- **RunLogs:** Shows run status; step list (by node position); expand step for details/iterations; “Review draft” / “Approve” opens ReviewModal; Re-run button; Download final video when available; audio playback for steps with voiceover.
- **ReviewModal:** Shown when a step is `waiting_review`. Draft video (presigned URL via `/storage/play`), **Approve** (resolveReview(…, 'approve')), **Edit EDL** (JSON textarea or open EdlEditor; then resolveReview(…, 'edit', approvedEdl)). Uses workflowStore `resolveReview`.
- **EdlEditor:** Full EDL UI: load EDL by `projectId` (projectsApi.getEdl), timeline clips, overlays, audio, color; save (projectsApi.updateEdl); render draft; export (resolution, progress, rendersApi.getStatus). Opened as overlay/portal from Builder when `edlEditorProjectId` is set (from Inspector “Edit” or ReviewQueuePanel “Edit”).

### 0.4 Web API surface (used by frontend)

| Area | Endpoints / usage |
|------|-------------------|
| **Auth** | POST `/auth/login`, POST `/auth/register`, GET `/auth/me` |
| **Workflows** | GET `/workflows`, GET `/workflows/:id`, PUT `/workflows/:id`, POST `/workflows`, DELETE `/workflows/:id`, POST `/workflows/:id/duplicate` |
| **Executions** | GET `/workflows/:id/executions`, POST `/workflows/:id/execute`, GET `/workflows/:id/executions/:execId`, POST `/workflows/:id/execute-node`, POST `/workflows/:workflowId/executions/:executionId/steps/:stepId/resolve-review` |
| **Runs / Review queue** | GET `/runs/:runId/review-queue`, POST `/runs/:runId/iterations/:iterationId/review/decide`, POST `/runs/:runId/iterations/:iterationId/regenerate-draft` |
| **Projects / EDL** | GET `/projects/:projectId`, GET `/projects/:projectId/edl`, POST `/projects/:projectId/edl/update`, GET `/projects/:projectId/export-preview`, POST `/projects/:projectId/render-draft` |
| **Renders** | GET `/renders/:jobId/status` |
| **Storage** | GET `/storage/play?key=...` (presigned URL for S3/storage keys) |
| **Idea docs** | GET `/idea-docs`, GET `/idea-docs?trash=1`, GET `/idea-docs/:id`, POST `/idea-docs`, PUT `/idea-docs/:id`, DELETE `/idea-docs/:id`, DELETE `/idea-docs/:id?permanent=1`, POST `/idea-docs/:id/restore` |
| **Voice profiles** | GET `/voice-profiles`, GET `/voice-profiles/:id`, POST `/voice-profiles`, POST `/voice-profiles/:id/assets` (multipart), POST `/voice-profiles/:id/train` |
| **Settings** | GET `/settings/keys`, POST `/settings/keys`, DELETE `/settings/keys/:id` |
| **Media** | POST `/media/upload` (multipart) |

Auth: Bearer token from storage (web: localStorage `auth-storage`; mobile: secure store). Same request/response shapes and error handling.

### 0.5 Web store usage (reference for mobile)

- **authStore:** user, token, login, register, logout, hydrate (GET /auth/me).
- **workflowStore:** workflows, activeWorkflowId, selectedNodeId, runLog, lastCompletedRunLog, inspectorTab, saveStatus, history/historyIndex; fetchWorkflows, fetchWorkflow, createWorkflowApi, deleteWorkflowApi, duplicateWorkflowApi, saveWorkflowToApi; setActiveWorkflow, selectNode, setInspectorTab; addNode, updateNodeConfig, removeNode, etc.; runWorkflow (execute + polling), runSingleNode, rerunFromNode, resolveReview.
- **edlEditorStore:** saveStatus for EDL editor UI.

Mobile does not need a full React Flow canvas; it needs equivalent **data** (workflow, run, review queue, project, EDL) and **actions** (open workflow, run, review decide, regenerate, open EDL editor, save EDL) where the product is “exactly similar.”

### 0.6 Route & screen mapping (web → mobile)

| Web route | Mobile equivalent | Notes |
|-----------|-------------------|--------|
| `/login` | Auth stack: Login | Same. |
| `/register` | Auth stack: Register | Same. |
| `/` (Dashboard) | Tab: **Projects** | Same content: workflow list, search, filter, create, open/duplicate/delete, user menu. |
| `/builder/:id` | Stack: **Builder** (optional) or deep link | Full parity: either a read-only/detail view of workflow + run + inspector-like queue/logs, or a simplified “run & review” flow without canvas. See §0.7. |
| `/settings` | Tab or stack: **Settings** | Same: API keys, theme, logout. |
| `/voice-profiles` | Stack: **Voice Profiles** | Entry from user menu or Settings. List, create, upload, train. |
| `/editor` (Ideas) | Stack: **Ideas Editor** | Entry from user menu. List, trash, Tiptap-like editor, create/load/save/delete/restore. |
| EDL editor (portal) | Stack: **EDL Editor** | Opened with `projectId` from Review Queue “Edit” or iteration detail. |

Suggested mobile nav: **Bottom tabs:** Projects, Runs, Review Queue, Settings. **Stack (root or per tab):** Project/Workflow detail, Run detail, Review Queue (for run), Iteration detail, Preview (video modal), EDL Editor, Voice Profiles, Ideas Editor. User menu (from Projects or Settings): Ideas & Scripts, Voice profiles, Settings, Sign out.

### 0.7 Builder parity options (mobile)

The web Builder is a full React Flow canvas with node library, inspector, run logs, and review queue in one screen. On mobile, “exactly similar” can be interpreted as:

- **Option A — Full UI parity:** Implement a mobile-friendly canvas (e.g. react-native-flow or custom pannable/zoomable graph), node library as sheet, inspector as sheet (Config / Queue / Logs), same Run and EDL entry points. Highest effort.
- **Option B — Same data, adapted UX:** No canvas on mobile. Workflow **detail** screen: name, description, status, **Run** button, **Executions** list, and “Review queue for this workflow” (by run). From Runs tab: pick workflow → run → review queue. Inspector “Queue” and “Logs” become run-centric screens (Run detail + Review Queue screen). EDL editor and Review modal (Approve/Edit) stay the same. Same APIs and store concepts; different layout.
- **Option C — Review-centric:** Mobile focuses on Runs and Review Queue; workflow creation/editing stays on web. Projects tab lists workflows and opens run list; Review Queue tab is run-scoped. EDL Editor and preview modal full parity.

Recommendation for “exactly similar” product: **Option B** for first release (same features and data, adapted layout); optionally add Option A later if a mobile canvas is required.

### 0.8 Feature parity checklist (by area)

- **Auth:** Login, Register, hydrate, logout, protected routes. ✅ Mobile has; keep aligned.
- **Dashboard/Projects:** List workflows, search, filter (all/draft/active), create, open, duplicate, delete, user menu (Ideas, Voice profiles, Settings, Sign out), theme. Mobile: ensure same filters, same menu items, same API (workflowsApi).
- **Builder (if Option B):** Workflow detail: name, description, status, Run, Executions list, link to Review queue by run. No canvas; Run and Review queue use same endpoints as web.
- **Runs:** List executions per workflow; run status; link to review queue for that run. Same API: GET `/workflows/:id/executions`, execution status/logs.
- **Review Queue:** Run selector; list from GET `/runs/:runId/review-queue`; filters/tabs (all, needs_review, approved, rendered, skipped, failed); search; per row: thumbnail, title, status, Regenerate (failed), Edit (projectId → EDL editor); **Approve/Skip** via POST `.../review/decide` (mobile can add if web adds later). Preview: modal with presigned draft/final video. Same query keys and mutations.
- **Review modal (in-context approve):** When a run is waiting for review, show Approve / Edit EDL (resolveReview). On mobile this can be a screen or modal when opening a “waiting” run.
- **EDL Editor:** Open with projectId; load EDL; edit timeline/overlays/audio; save; render draft; export (resolution, progress). Same APIs: projectsApi, rendersApi, storage/play.
- **Settings:** API keys list, add (with service select), delete, theme. Same endpoints and options.
- **Voice Profiles:** List, get, create (name, provider, voice ID, language), upload assets, train. Same API; mobile uses same service options.
- **Ideas Editor:** List (all + trash), get, create, update, delete, restore; rich editor (Tiptap on web); autosave. Same API; mobile can use a simpler rich editor that persists same content shape.

### 0.9 Prioritized implementation order (full parity)

1. **Auth & core nav** — Already done. Keep user menu items aligned (Ideas, Voice profiles, Settings).
2. **Projects (Dashboard parity)** — Same list, search, filter, create, duplicate, delete, open; user menu.
3. **Runs** — Executions list per workflow; run detail with status and link to Review queue.
4. **Review Queue** — Full parity: run selector, queue list, filters, search, Preview modal (video), Edit → EDL Editor, Regenerate, Approve/Skip (decideReview).
5. **EDL Editor** — Open by projectId; load/save EDL; render draft; export flow (same APIs).
6. **Settings** — API keys CRUD and service select (same as web).
7. **Voice Profiles** — List, create, upload assets, train (same API).
8. **Ideas Editor** — List, create, load, edit, delete, restore; autosave (same API and content shape).
9. **Builder (Option B)** — Workflow detail screen with Run and Executions and link to Review queue; no canvas.
10. **Optional:** Builder Option A (mobile canvas) or Run logs view (step list, Review modal for waiting_review).

---

## 1. High-Level Objective

Build the mobile app so it **reuses as much of the web app** as possible: product structure, logic, naming, state shape, API contracts, schemas, and UX patterns.

**Core principle:** The mobile app is a **mobile version of the same product**, not a separate product. Do not rebuild workflow logic differently on mobile; reuse architecture, route names, feature names, API hooks, Zustand stores, Zod schemas, and domain models wherever possible. Adapt UI for mobile only where necessary. Backend remains shared.

**Core modules to mirror:**

| Module | Web | Mobile |
|--------|-----|--------|
| Auth / session | Login, register, JWT | Same; session bootstrap |
| Projects | Projects/workflows list | Same projects, card-based layout |
| Workflow runs | Runs list, detail | Runs list, run detail |
| Review Queue | Queue table, per-row actions | Queue FlatList, same actions |
| Iteration details | Iteration view, draft/final | Same; iteration detail screen |
| Draft preview | Video preview, play | Same; modal or full-screen player |
| Video editor | EDL editor launcher | Editor launcher (runId + iterationId) |
| Settings | Settings page | Settings screen |
| Media import/upload | (Web may differ) | Import footage, upload progress |
| Export/progress | Export, progress UI | Export/progress screens |

**Consistency targets:**

- Same feature names, data shapes, API hook names, store naming, validation schemas, status enums.
- Same terminology: **run**, **iteration**, **review queue**, **draft**, **final render**, **approve / skip / regenerate**, **editor**, **workflow**, **ideas source**.

---

## 2. Architecture Requirements

### A) Shared domain model

Create or reuse a **shared package/module** so mobile and web both use the same:

- RunStatus enums
- IterationStatus enums
- ReviewDecision enums
- EDL schema
- Workflow schema
- Node config schemas
- API DTOs

Use **Zod + TypeScript**. If a shared package already exists or can be created cleanly, use it; otherwise define shared types/schemas in a dedicated module that both frontend and mobile can consume (e.g. `shared/` at repo root or copied contract).

### B) Shared API client patterns

Mirror the web app API client structure in mobile:

- Same endpoint helpers (e.g. `getRuns`, `getReviewQueue`, `postReviewDecide`).
- Same auth token handling pattern (e.g. Bearer in headers, secure storage on mobile).
- Same React Query key naming where possible (e.g. `['runs']`, `['review-queue', runId]`).
- Same mutation names where possible (e.g. `useApproveIteration`, `useSkipIteration`).

### C) Shared naming

Use the same terminology as the web app everywhere (labels, routes, variables, keys):

- run, iteration, review queue, draft, final render, approve, skip, regenerate, editor, workflow, ideas source.

### D) Shared business logic

Where the web app has reusable business logic, move it to shared modules where possible:

- Formatting functions (dates, status labels).
- Status mappers (enum → display).
- DTO parsers / validation.
- Upload helpers (presign + PUT pattern).

---

## 3. Mobile UI Scope

**Main screens:**

1. Auth / session bootstrap
2. Projects screen
3. Runs screen
4. Review Queue screen
5. Iteration detail screen
6. Editor launcher / editor container
7. Import footage screen
8. Upload progress / export progress
9. Settings

**Navigation:**

- **Bottom tabs:** Projects, Runs, Review Queue, Settings.
- **Stack (per tab or root stack):** run detail, iteration detail, preview (video modal), editor, import/upload flow.

---

## 4. UX Principles

- **Mirror web app UX** where possible: same statuses, same actions, same content hierarchy, same labels, same color system, same dark-theme feel.
- **Adaptations for mobile:**
  - Bottom sheets instead of desktop side panels.
  - FlatList instead of tables.
  - Stacked cards instead of wide grids.
  - Full-screen routes instead of modal-heavy desktop flows when it fits better.
- **Preserve:** Same product identity, same feature logic, same user mental model.

---

## 5. Feature Mapping (Web → Mobile)

See **§0.6 Route & screen mapping** and **§0.8 Feature parity checklist** for the full mapping derived from the web scan. Summary:

| Feature | Web | Mobile |
|---------|-----|--------|
| **A) Projects** | Dashboard: workflows list, search, filter, create, open/duplicate/delete, user menu | Same: Projects tab; card-based layout; same API and filters. |
| **B) Runs** | Executions per workflow (Builder context); run status, logs | Runs tab: workflow picker → executions list; run detail with link to Review queue. |
| **C) Review Queue** | Inspector Queue tab (review node) or standalone; list, filters, search; row: Preview, Edit, Regenerate; API: decideReview for approve/skip | Same: run selector, FlatList, filters, Preview modal, Edit → EDL Editor, Regenerate, Approve/Skip. |
| **D) Iteration details** | In RunLogs / Review queue context | Dedicated iteration detail screen: title, statuses, draft/final preview, actions. |
| **E) EDL Editor** | Portal from Builder (Inspector/ReviewQueuePanel “Edit”); projectId; load/save EDL, render draft, export | Same: stack screen with projectId; same APIs (projectsApi, rendersApi, storage/play). |
| **F) Settings** | API keys CRUD, service select, theme | Same screen; same endpoints. |
| **G) Voice Profiles** | List, create, upload assets, train | Same; entry from user menu or Settings. |
| **H) Ideas Editor** | List + trash, Tiptap, create/load/update/delete/restore, autosave | Same; entry from user menu; same API and content shape. |
| **I) Builder** | Full canvas, NodeLibrary, Inspector (Config/Queue/Logs), Run, EDL entry | Option B: workflow detail (Run, Executions, link to Review queue); no canvas. Option A later if needed. |
| **J) Import footage** | (Web: media/upload where used) | Mobile: pick video, presign, upload; see §11. |

---

## 6. Technical Mobile Stack

- React Native + Expo (Expo Go–compatible where practical; do not compromise architecture).
- React Navigation (stack + bottom tabs).
- TanStack React Query, Zustand, React Hook Form, Zod.
- lucide-react-native for icons.
- NativeWind or a clean RN style system; dark mode, premium, clean.
- @gorhom/bottom-sheet for mobile panels.
- expo-image (or equivalent) for media previews.
- expo-image-picker, expo-file-system for footage selection and upload.
- Secure token storage for auth (e.g. expo-secure-store).

**Web app stack (reference):** React 18, Vite 5, TypeScript 5, React Router 6, Zustand, TanStack React Query, Tailwind, Radix/shadcn, Framer Motion, React Hook Form, Zod, React Flow, Tiptap, @dnd-kit, Lucide, date-fns, Recharts, cmdk, Sonner, next-themes, CVA, clsx, tailwind-merge.  
**Backend (shared):** Node, Express 4, TypeScript 5, Prisma, JWT, AWS S3 presigned, BullMQ + IORedis, OpenAI, Zod.

---

## 7. Implementation Strategy

Do **not** duplicate web DOM components into mobile. Instead:

1. Inspect the frontend feature structure in `/frontend`.
2. Identify reusable logic, schemas, services, stores.
3. Extract shared code where appropriate.
4. Build mobile-native UI on top of the same product model.

**Priority order:**

1. Shared schemas / types / utilities.
2. Shared API client patterns.
3. Auth / session bootstrap.
4. Projects screen.
5. Runs screen.
6. Review Queue.
7. Iteration detail.
8. Import footage.
9. Editor launcher flow.
10. Settings.

---

## 8. Deliverables

### A) Folder organization in `/mobile`

Use a clear, scalable structure, e.g.:

```
mobile/
  src/
    app/
    screens/
    components/
    features/
      auth/
      projects/
      runs/
      review/
      editor/
      media/
      settings/
    lib/
      api/
      auth/
      storage/
      uploads/
    store/
    hooks/
    navigation/
    theme/
    types/
```

(or a better equivalent that matches the above feature set).

### B) Shared layer

Create or wire a shared package/module for: schemas, types, constants, API DTOs. Same as in §2A.

### C) Mobile screens with placeholder where backend is not ready

- Keep UI structure in place.
- Stub/mock minimally when an endpoint is missing.
- Add clear TODO comments.

### D) Same product language

Use the same labels and concepts as the web app everywhere.

### E) Minimal design parity

Dark mode, modern, premium, clean.

---

## 9. Constraints

- Do **not** break the web app.
- Do **not** rename backend contracts unnecessarily.
- Do **not** create a separate product architecture for mobile.
- Reuse as much as possible from the web version.
- Preserve scalability; keep code typed and modular.
- Use Zod where validation is needed.
- Prefer composition and shared services over copy-pasted logic.

---

## 10. What to Do Now

Implement the mobile architecture **incrementally**:

1. **Audit** the frontend feature structure in `/frontend`: routes, API hooks, stores, schemas, domain types, status enums.
2. **Identify** what can be shared (schemas, types, API key/hook patterns, status mappers, DTOs).
3. **Create the shared layer** if needed (schemas, types, constants; align with web).
4. **Scaffold** the mobile app: feature folders, navigation (tabs + stack), theme, API client pattern.
5. **Implement first:** Projects, Runs, Review Queue — mirroring web API hooks, domain types, and status handling as much as possible.

At the end of each phase, document: what was shared, what remained mobile-specific, what still needs backend support (see §15).

---

## 11. Feature Spec: Import Footage

Implement an **Import Footage** flow: pick video from iPhone Photos (including iCloud), upload to backend storage via S3 presigned URLs.

**Assumptions:** Backend exposes **POST /api/uploads/presign** with body `{ filename, contentType }`, response `{ uploadUrl, fileUrl, key }`.

**Requirements:** Entry from Import screen or “Import Footage” on Projects; expo-image-picker (video only); copy to app cache if needed (expo-file-system); presign then PUT to `uploadUrl` with correct headers; success/error UI; store `fileUrl` in local state for now; progress indicator (percentage if possible, else indeterminate); typed, use env base URL. Reusable helper in **mobile/src/lib/upload.ts** (or under `lib/uploads/`).

**Deliverables:** Working import + upload flow; reusable upload helper.

*(See also §13 for backend/mobile change list.)*

---

## 12. Feature Spec: Review Queue

Implement the **Review Queue** tab: list iteration drafts from a workflow run with same actions as web.

**Assumptions:** **GET /api/runs/:runId/review-queue** returns `[{ iterationId, title, status, draftVideoUrl, finalVideoUrl? }]`. **POST /api/runs/:runId/iterations/:iterationId/review/decide** for approve/skip. MVP run selection: input for `runId` or pick last run from **GET /api/runs**.

**Requirements:** Run selector; FlatList of items; each row: optional thumbnail, title, status pill, actions (Preview, Approve, Skip, Edit). Preview = modal with video player; Approve/Skip = POST decide; Edit = navigate to editor with runId + iterationId. TanStack Query for fetch and mutations; optimistic updates for approve/skip. Dark mode, modern styling; use env base URL.

**Deliverables:** Functional Review Queue screen; same product language and actions as web.

*(See also §13 for backend/mobile change list.)*

---

## 13. What to Update / Change

### 13.1 Backend (Import Footage)

| Item | Action |
|------|--------|
| Presign | Confirm **POST /api/uploads/presign** (body: `filename`, `contentType`; response: `uploadUrl`, `fileUrl`, `key`). JWT-protected. S3 key scheme e.g. `video-uploads/{userId}/{uuid}-{filename}`. |

### 13.2 Backend (Review Queue)

| Item | Action |
|------|--------|
| Review queue | Confirm **GET /api/runs/:runId/review-queue** returns array of iterations with `iterationId`, `title`, `status`, `draftVideoUrl`, `finalVideoUrl?`. |
| Review decide | Confirm **POST .../review/decide** accepts body e.g. `{ decision: 'approve' }` or `{ decision: 'skip' }`. |
| List runs | If using “last run”: confirm **GET /api/runs** returns list (e.g. ordered by date). |

### 13.3 Mobile App (Import Footage)

| Item | Action |
|------|--------|
| Navigation / UI | Import screen or “Import Footage” on Projects; pick video → progress → success/error. |
| **lib/upload.ts** | Reusable presign + PUT, progress callback, error handling; use env base URL. |
| API client | Use existing API client for presign (with auth); do not send auth to S3 PUT. |
| Permissions | iOS photo library usage description (expo-image-picker). |

### 13.4 Mobile App (Review Queue)

| Item | Action |
|------|--------|
| Screen | Run selector, FlatList, row (thumbnail optional, title, status pill, Preview / Approve / Skip / Edit). |
| TanStack Query | useQuery for review-queue and runs; useMutation for decide; keys e.g. `['runs']`, `['review-queue', runId]`. Optimistic updates for approve/skip. |
| Preview | Modal/bottom sheet with video player (expo-video). |
| Edit | Navigate to editor with runId + iterationId. |

### 13.5 Frontend

No structural change required for mobile parity; reuse existing API and contracts. Optional: align any new shared types/schemas if added for mobile.

### 13.6 Docs

Update this doc when features are implemented; optional README notes for Import (presign, permissions) and Review Queue (endpoints).

---

## 14. Mobile Roadmap

- [x] **Shared layer** — `@mohtawa/shared`: RunStatus, ReviewQueue, Workflow, EDL schemas + types; built to `dist/`.
- [x] **Scaffold** — `mobile/src/lib/api/endpoints.ts`, `theme/colors.ts`, dark nav; API mirrors frontend paths.
- [x] **Auth / session** — Login/Register screens; secure token storage (expo-secure-store); hydrate on load; logout in Settings. Use LAN (not tunnel) or set EXPO_PUBLIC_API_URL so device can reach backend.
- [x] **Projects (Dashboard parity)** — List, search, filter (all/draft/active), create, duplicate, delete, user menu (Ideas, Voice profiles, Settings, Import footage, Sign out). Open → Workflow detail.
- [x] **Runs** — Workflow picker + executions list; tap run → Run detail; Run detail has run logs (steps + status), "Open Review Queue", "Open final video" when available.
- [x] **Review Queue** — Run ID input (or runId from params), filters (all/needs_review/approved/rendered/skipped/failed), search, Approve/Skip, Regenerate (failed), Preview (VideoPreviewModal + presigned URL), Edit → EDL Editor; tap row → Iteration detail.
- [x] **Iteration detail** — Screen with runId, iterationId, title; Preview video, Edit draft → EDL Editor. Opened from Review Queue row.
- [x] **Import footage** — Screen from user menu; pick video (expo-image-picker), upload via POST /media/upload (multipart); success/error UI.
- [x] **Editor launcher / EDL Editor** — Navigate with projectId; load EDL, show clip count, Save EDL, Render draft. Same APIs as web.
- [x] **Settings** — API keys list, add (service select + key + optional label), delete; account + Sign out.
- [x] **Voice Profiles** — List, create (name, provider, voice ID, language), Train. Upload assets (expo-document-picker, POST /voice-profiles/:id/assets). Entry from user menu.
- [x] **Ideas Editor** — List (all + trash), create, load doc, title + content; Markdown mode (default) and JSON mode; Tiptap JSON ↔ Markdown conversion (`ideaDocMarkdown.ts`); autosave, delete, restore. Entry from user menu.
- [x] **Builder (Option B)** — Workflow detail screen: workflow name/description/status, Run workflow, Executions list, "Review queue" per run.
- [x] **Workflow detail: nodes list** — Read-only list of workflow nodes (label + type) on Workflow Detail screen; single ScrollView with Nodes section then Runs.
- [x] **Export / progress** — EDL Editor: poll render status after "Render draft", progress bar + status, "Preview video" and "Dismiss" when done.
- [x] **expo-av → expo-video** — VideoPreviewModal now uses `expo-video`; expo-av removed from dependencies.
- [x] **Run logs view** — Run detail: fetch execution via GET /workflows/:id/executions/:execId; show run status, steps list (node title, status, error), "Open Review Queue", "Open final video" when step output has finalVideoUrl/finalVideoKey.
- [x] **Richer Ideas Editor** — Markdown edit mode with JSON fallback; headings (#), paragraphs, --- for dividers; stored as Tiptap JSON for API/web parity.
- [x] **Builder Option A (mobile canvas)** — Edit canvas from Workflow detail; pan/scroll canvas, nodes + edges (SVG), add node (library), move node (drag), delete node (inspector); workflowsApi.update for nodes/edges.
- [x] **Wire web frontend to `@mohtawa/shared`** — Web app imports RunStatus, RunStep, RunLog, IterationStepLog, NodeCategory from shared; review types (ReviewQueueItem, ReviewQueueResponse, ReviewDecideBody) from shared in api.ts.
- [x] **Mobile builder parity (edges)** — Create edge: tap output handle then input handle (cycle/duplicate validation). Delete edge: Inspector → Connections tab, delete per edge.
- [x] **Mobile builder parity (TopBar)** — Editable workflow name (via settings), status badge, save status (✓/●/…), Undo/Redo, workflow settings (name, description, status), Run button.
- [x] **Mobile builder parity (Run + logs)** — Run from canvas header; Inspector Logs tab with run status, steps list, Re-run; node cards show run status dot.
- [x] **Mobile builder parity (Inspector)** — Tabs: Config | Logs | Queue (review node) | Connections. Config: node config form (text/textarea/number/select/toggle, voice profile + idea doc pickers), Duplicate, Disable/Enable, Delete. Queue: link to Review Queue. Connections: list and delete edges.
- [x] **Mobile builder parity (node config form)** — `nodeDefinitionsFields.ts` + `NodeConfigForm.tsx`; fields per type; voice profile and idea doc pickers; config persisted via updateNodeConfig.

---

## 15. Summary: Shared vs Mobile-Specific vs Backend

| Category | Implemented / Notes |
|----------|---------------------|
| **Shared** | `shared/`: RunStatus, RunLog, RunStep; ReviewQueueItem, ReviewQueueResponse, ReviewDecideBody; WorkflowListItem, ExecutionListItem; NodeCategory, WorkflowStatus; EDL placeholder. Same endpoint contracts; mobile uses same query keys `['workflows']`, `['review-queue', runId]`, `['voice-profiles']`, `['idea-docs']`. |
| **Mobile-specific** | Root stack (MainTabs, WorkflowDetail, RunDetail, EdlEditor, VoiceProfiles, IdeasEditor, IterationDetail, ImportFootage); bottom tabs (Projects, Runs, Review Queue, Settings); full API in `lib/api/endpoints.ts` (workflows, storage, media, projects, renders, settings, voiceProfiles, ideaDocs, runs); `lib/playableUrl.ts` (presigned video); `lib/apiFormData` for uploads; VideoPreviewModal; dark theme. |
| **Backend** | No changes. Mobile uses existing workflows, executions, runs/review-queue, decide, regenerate-draft, projects/EDL, renders, storage/play, settings/keys, voice-profiles, idea-docs, media/upload. |

---

## 16. What to Do Next

**Status:** All planned mobile features are implemented. Mobile builder parity is in place: edges (create/delete), TopBar (name, status, save, undo/redo, settings, Run), Run + run logs in builder, Inspector (Config with full node form, Logs, Queue, Connections), node cards (handles, status dot, category accent, config summary, Duplicate/Disable in inspector), workflow meta dialog, tap-to-place for adding nodes. Web frontend is wired to `@mohtawa/shared` and uses shared zod schemas for runtime validation.

**Web app alignment (done):** Frontend now validates API responses and request bodies with shared schemas: review queue GET with `ReviewQueueResponseSchema`, decide body with `ReviewDecideBodySchema`, workflow list and single workflow with `WorkflowListItemSchema`, run log when restoring with `RunLogSchema`. On parse failure the app logs a warning and falls back to raw data so behaviour stays backward-compatible; keep shared and frontend in sync when API contracts change.

**Remaining (non-mobile):** None specified. Optional: extend shared schemas for other endpoints (idea-docs, voice-profiles, etc.) as needed.

---

## 17. Mobile Builder vs Web: Gaps

Status after implementation: **core parity done.** The tables below mark what is **Done** on mobile vs **Remaining** (optional polish).

### 17.1 Connections (edges) — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Create edge | Drag from output handle to input handle; validated. | **Done.** Tap output handle then input handle; cycle/duplicate validation. |
| Delete edge | Click X on edge. | **Done.** Inspector → Connections tab, delete per edge. |

### 17.2 Top bar and workflow chrome — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Workflow name | Editable in TopBar. | **Done.** Tappable → workflow settings; name in header. |
| Status badge | Draft / Active / Archived. | **Done.** Badge in header. |
| Save status | Saving… / Saved / Unsaved. | **Done.** ✓ / ● / … in header. |
| Undo / Redo | Buttons + shortcuts; history. | **Done.** Buttons in header; history stack. |
| Workflow settings | WorkflowMetaDialog. | **Done.** Modal: name, description, status. |
| Theme toggle | In TopBar. | **N/A.** App uses single dark theme; no toggle in codebase. |
| Run workflow | Run button in TopBar. | **Done.** Run button in header. |

### 17.3 Run and run state in builder — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Run from builder | TopBar Run; run log restored. | **Done.** Run in header; execution fetched. |
| Run logs in builder | Inspector Logs tab. | **Done.** Logs tab: status, steps, Re-run. |
| Node status on canvas | Status dot per node. | **Done.** Status dot on node cards from run log. |

### 17.4 Inspector and node config — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Inspector tabs | Config \| Queue \| Logs. | **Done.** Config \| Logs \| Queue (if review) \| Connections. |
| Node config form | Full form; voice/idea doc pickers; etc. | **Done.** NodeConfigForm: text/textarea/number/select/toggle; voice profile + idea doc pickers; persisted. |
| Review queue in builder | Queue tab with list + actions. | **Done.** Queue tab with “Open Review Queue” (navigates to tab). |
| Open EDL from builder | From Review config/queue → Edit draft. | **Done.** Queue tab shows “Edit draft” when run has projectId; navigates to EdlEditor. |

### 17.5 Node card on canvas — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Input/output handles | Handles for connections. | **Done.** Handles per node from nodeDefinitionsHandles. |
| Category accent | Category border/background. | **Remaining.** Basic card; no category accent. |
| Status dot | From run log. | **Done.** |
| Node menu | Duplicate, Disable/Enable, Delete. | **Done.** In Inspector Config: Duplicate, Disable/Enable, Delete. |
| Config summary on card | First 2 fields, audio/video preview. | **Remaining.** Title only on card. |

### 17.6 Adding nodes — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Node library | Sidebar/sheet; categories. | **Done.** Modal with categories; tap to add. |
| Search / filter nodes | Command palette search. | **Done.** Search field in Add node modal; filter by title/type. |
| Drag from library onto canvas | Drag and drop at position. | **Done.** Tap-to-place: choose node → “Tap on canvas to place node” → tap to place at that position (scroll/scale-aware). |

### 17.7 Other — **Done**

| Feature | Web | Mobile |
|--------|-----|--------|
| Zoom | Controls + MiniMap. | **Done.** Zoom In / Zoom Out buttons in header; scale 0.5–2. |
| Keyboard shortcuts | Save, Undo, Redo, Delete. | N/A on mobile. |
| Delete node without inspector | Delete key. | **Done.** Long-press on node → Alert → Delete. |

---

**Summary — Remaining on mobile (optional):** Theme toggle N/A (single dark theme). Optional: drag-from-library to position. All other polish implemented: open EDL from builder, category accent, config summary, long-press delete, search in node library, zoom controls (+/-).

---

## 18. Mobile EDL / Video Editor Parity Plan

This section is the **full planning** to implement the **same** video/EDL editor as the web app on mobile. The web editor lives in `frontend/src/components/builder/EdlEditor.tsx` and `frontend/src/components/builder/editor/`. The mobile app currently has a minimal EDL screen (project ID, clip count, Save EDL, Render draft, progress, preview) and explicitly tells users to use the web app for advanced editing. The goal is **exact parity**: same data, same actions, same options, adapted UI for touch.

---

### 18.1 Web Editor — What Is Implemented

#### 18.1.1 Data model (EDL)

- **Timeline clips** (`EdlTimelineClip[]`): `id`, `clipUrl`, `inSec`, `outSec`, `startSec`, `sourceDurationSec?`. Clips are ordered; `startSec` is computed from previous clip durations.
- **Overlays** (`EdlTextOverlay[]`): `id`, `type: 'text'`, `text`, `startSec`, `endSec`, `position?`, `style?`, `stylePreset?` (e.g. `bold_white_shadow`, `yellow_caption`, `minimal_lower`).
- **Audio** (`EdlAudio`): `voiceoverUrl`, `musicUrl?`, `voiceGainDb?`, `musicGainDb?`, `musicEnabled`, `musicVolume`, `voiceVolume`, `originalVolume?`, `applyOriginalToAll?`, `videoTrackMuted`, `audioTrackMuted`, `musicTrackMuted`.
- **Color** (`EdlColor`): `saturation`, `contrast`, `vibrance` (defaults 1; ranges e.g. 0.8–1.3, 0.9–1.2).
- **Output** (`EdlOutput`): `width`, `height`, `fps?` (used for export resolution/fps).

APIs: `GET /projects/:projectId`, `GET /projects/:projectId/edl`, `POST /projects/:projectId/edl/update`, `GET /projects/:projectId/export-preview`, `POST /projects/:projectId/render-draft`, `GET /renders/:jobId/status`, `GET /storage/play?key=...` (presigned URLs for S3 clip/voiceover URLs).

#### 18.1.2 Core actions (web)

- **Undo/redo:** In-memory history (past/future stacks, max 50); no API.
- **Timeline:** `reorderClips(fromIndex, toIndex)` (drag-and-drop); `setClipTrim(index, 'inSec'|'outSec', value)`; `setClipSlip(index, deltaSec)`; `setClipSlipInAbsolute(index, newInSec)`; `deleteClip(index)` (min 1 clip); `duplicateClip(index)`; `splitClipAtPlayhead(clipIndex, playheadSec)`.
- **Overlays:** `setOverlayTrim(overlayIndex, 'startSec'|'endSec', value)`; `deleteOverlay(overlayIndex)`; add overlay (new text overlay with default times); update overlay text/position/stylePreset.
- **Save:** `handleSaveDraft` — `projectsApi.updateEdl(projectId, edl)` only.
- **Export/render:** `handleSaveAndRerender(options?)` — update EDL (optionally with output dimensions from ExportOptions), then `projectsApi.renderDraft(projectId)`; sync or async job; poll status or project.draftVideoUrl; ExportModal options: resolution (HD/2K/4K), fps (24/30/60), color (SDR/HDR).

#### 18.1.3 UI structure (web)

- **EditorTopBar:** Close, project name, resolution badge, Save draft (with dirty/saving state), Export (opens ExportModal), Undo/Redo, export progress. Optional closeButtonRef for mobile focus.
- **Preview area:** Fixed aspect ratio (9:16) preview; **LivePreviewPlayer** — plays draft video or composite from timeline clips + overlays + color filter; playhead sync; voiceover URL; video/audio mute toggles; tap overlay to select.
- **PlaybackControls:** Play/pause, current time, duration, seek bar (scrub).
- **Timeline (TimelineTracks):** Horizontal scroll; pixels-per-second constant (e.g. 80); ruler (time labels); **video track** — sortable clip blocks (drag-and-drop via @dnd-kit), thumbnails from resolved clip URLs, trim handles (in/out) on each clip, selection ring; **overlay track** — text overlay blocks (startSec–endSec); **audio track** — waveform from resolved voiceover URL (or placeholder bars). Click clip/overlay to select; drag clip to reorder; drag trim handles to set inSec/outSec. Slip: enter slip mode for selected clip → SlipModeOverlay (source in/out shift), confirm/cancel.
- **BottomToolbar:** Horizontal scroll of tool buttons — Volume, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker, **Trim**. Only **Adjust**, **Audio**, **Captions**, **Trim** open sheets/panels; Trim enabled only when a clip is selected.
- **ClipToolbar / ContextualActionBar:** When a **video clip** is selected: Split (at playhead), Edit (opens Trim), Volume (opens Audio sheet), Duplicate, Delete, Slip (enter slip mode). When **text overlay** is selected: Edit (Captions), Delete. When slip mode active: Confirm, Cancel.
- **Sheets (bottom, max-h 70vh):** **TrimSheet** — selected clip in/out sliders, commit trim. **AdjustSheet** — Saturation, Contrast, Vibrance sliders; Reset. **CaptionsSheet** — list of text overlays; add overlay; per overlay: text input, style preset select, start/end time; delete. **AudioControlSheet** — tabs: Original video, Voice over, Background music; per tab: volume slider(s), mute toggle; voiceover/music URLs from EDL (read-only or editable depending on web).
- **ExportModal:** Resolution (HD / 2K / 4K), FPS (24 / 30 / 60), Color (SDR / HDR); Export button; on confirm calls `onExport(options)`.
- **ExportScreen:** Full-screen overlay when exporting; progress bar, preview image (if available), output video URL when done; Dismiss.

#### 18.1.4 Resolved URLs and helpers

- **Resolved clip URLs:** For each `edl.timeline[].clipUrl`, if S3 then GET `/storage/play?key=...` for presigned URL; store in `resolvedClipUrls[i]` for thumbnails and preview.
- **Resolved voiceover URL:** Same for `edl.audio.voiceoverUrl`; used for waveform and playback.
- **Helpers:** `ensureEdlIds(edl)` (ensure timeline/overlays have ids); `splitTimelineAtPlayhead(timeline, clipIndex, playheadSec)`; `parseS3Key(url)`; `buildPreviewFilter(color)` (CSS filter for live color preview).

#### 18.1.5 Store (web)

- **edlEditorStore (Zustand):** `selectedBlock` (video clip id | text overlay id | 'adjust' | 'music' | 'audio' | null), `activeTool` ('adjust'|'audio'|'captions'|'trim'|null), `saveStatus`, `slipMode`, `slipClipId`, `slipOriginalInSec`; actions: setSelectedBlock, setActiveTool, setSaveStatus, setSlipMode, setSlipOriginalInSec.

---

### 18.2 Mobile EDL Screen — Current State (updated)

- **EdlEditorScreen:** Route param `projectId`. Load EDL via `projectsApi.getEdl(projectId)`; header (back, “Edit draft”, resolution badge, Save, Export, Undo, Redo); video preview (maxHeight) and playback controls (play/pause, time, seek bar); **timeline section** with “Timeline” title and minHeight so timeline is visible by default; contextual action bar when clip/overlay selected (Move left/right, Split, Trim, Duplicate, Delete, Slip for clip; Edit, Delete for overlay); bottom toolbar (Adjust, Audio, Captions, Trim when clip selected); **Save EDL** and **Render draft**; Export modal (resolution/fps); render progress overlay; save-on-close prompt.
- **Implemented:** Timeline visible by default (timeline section + preview maxHeight). Playhead vertical line across tracks. Ruler with time labels (0s, 1s, …) positioned correctly. Track order matches web: (1) Text/Overlays, (2) Adjust (tappable → Adjust sheet), (3) Music placeholder, (4) Voice (waveform-style placeholder when `resolvedAudioUrl` set), (5) Video. Clip blocks: thumbnails from `resolvedClipUrls`, duration badge on selected clip, **trim handles** (left/right) with pan gesture calling `onClipTrim` → `setClipTrimInOut`. Move left/right, Split, Trim sheet, Duplicate, Delete, Slip sheet; Adjust, Audio, Captions sheets; overlay add/edit/delete in Captions. Reorder via Move left/right (no timeline drag-and-drop yet).
- **Remaining (see §18.8):** Overlay trim handles on timeline (optional); Export Color (SDR/HDR) if backend supports; optional drag-and-drop reorder; real voice waveform from decoded audio (placeholder in place).

---

### 18.3 Full Planning — Implement Same Editor on Mobile

#### Phase 1 — Data, API, and state

| Task | Description |
|------|-------------|
| 1.1 EDL types | Use or mirror web EDL types (EdlTimelineClip, EdlTextOverlay, EdlAudio, EdlColor, EdlOutput, EDL) in mobile; prefer shared package if/when EDL schema lives there. |
| 1.2 API | Already have projectsApi.getEdl, updateEdl, get, renderDraft; add getExportPreview if used. rendersApi.getStatus. Presigned URLs: same pattern as web (storage/play for clipUrl and voiceoverUrl). |
| 1.3 ensureEdlIds | Port `ensureEdlIds(edl)` and call after loading EDL. |
| 1.4 Resolved URLs | After load: resolve timeline clip URLs and voiceover URL (S3 → presigned); store in state (e.g. resolvedClipUrls[], resolvedAudioUrl). Use for thumbnails, waveform, and preview player. |
| 1.5 Undo/redo | Local state: past[] and future[] (EDL snapshots), HISTORY_MAX=50; actions: push to past on updateEdl, undo/redo replace current EDL and swap stacks. |
| 1.6 Editor state | Selected clip/overlay (id or index), activeTool (adjust | audio | captions | trim | null), saveStatus, slipMode + slipClipId + slipOriginalInSec. Can use Zustand (edlEditorStore) or React state on EdlEditorScreen. |

#### Phase 2 — Preview and playback

| Task | Description |
|------|-------------|
| 2.1 Preview area | Fixed 9:16 viewport; use expo-video or React Native Video component for **draft** playback when playUrl is set (same as current preview after render). |
| 2.2 Playhead and duration | State: playheadSec, videoDuration, playing. On time update from player, set playheadSec (throttled). Seek: set player currentTime from seek bar. |
| 2.3 Playback controls | Play/pause button, current time / duration display, seek bar (slider or scrubber); callbacks to play/pause and seek. |
| 2.4 Composite preview (stretch) | Web uses LivePreviewPlayer that can composite timeline clips + overlays + color. On mobile, first option: single draft video only (playUrl) like today; later: optional composite preview using same logic if feasible (expo-video or native modules). Document as “Phase 2.4 optional.” |

#### Phase 3 — Timeline UI

| Task | Description |
|------|-------------|
| 3.1 Layout | Horizontal ScrollView (or FlatList with horizontal) for timeline; fixed “pixels per second” (e.g. 80); total width = totalDurationSec * PIXELS_PER_SECOND. |
| 3.2 Ruler | Time labels above timeline (e.g. 0s, 5s, 10s …). |
| 3.3 Video track | One row of clip blocks. Each block: width = (outSec - inSec) * PPS, left = startSec * PPS; thumbnail (from resolvedClipUrls[index]) or placeholder; optional trim handles (drag to change inSec/outSec). Tap to select. |
| 3.4 Reorder | Drag clip to new position (react-native-draggable-flatlist or gesture handler); on drop, call reorderClips(fromIndex, toIndex) and recompute startSec. |
| 3.5 Overlay track | Second row: blocks for each overlay (startSec–endSec); label or “Text”; tap to select. |
| 3.6 Audio track | Third row: waveform (from resolved voiceover URL) or placeholder bars; optional click-to-seek. Reuse or port web’s AudioWaveformCanvas / useAudioPeaks if possible on RN. |
| 3.7 Trim on timeline | Per-clip in/out handles that update setClipTrim(index, field, value); or open Trim sheet on clip select and edit there. |

#### Phase 4 — Clip and overlay actions

| Task | Description |
|------|-------------|
| 4.1 Contextual bar | When a video clip is selected: Split (at playhead), Trim (open Trim sheet), Volume (open Audio sheet), Duplicate, Delete, Slip. When overlay selected: Edit (Captions), Delete. Implement reorderClips, setClipTrim, setClipSlip, setClipSlipInAbsolute, deleteClip, duplicateClip, splitClipAtPlayhead, setOverlayTrim, deleteOverlay (and add overlay in Captions). |
| 4.2 Split at playhead | Port splitTimelineAtPlayhead; button “Split” enabled when playhead is strictly inside selected clip; on press call splitClipAtPlayhead(selectedClipIndex, playheadSec). |
| 4.3 Slip mode | When user chooses Slip: set slipMode true, slipClipId = selected clip id, store slipOriginalInSec. Show Slip modal/sheet: UI to set source in point (or delta); setClipSlipInAbsolute(index, newInSec); Confirm → exit slip; Cancel → setClipSlipInAbsolute(index, slipOriginalInSec), exit slip. |

#### Phase 5 — Tool sheets (bottom sheets or modals)

| Task | Description |
|------|-------------|
| 5.1 Trim sheet | When activeTool === 'trim' and a clip is selected: bottom sheet with TrimSheetContent — in/out sliders (or numeric inputs) for selected clip; commit updates setClipTrim and close. |
| 5.2 Adjust sheet | When activeTool === 'adjust': sheet with Saturation, Contrast, Vibrance sliders (same ranges as web); Reset button; updates edl.color. |
| 5.3 Audio sheet | When activeTool === 'audio' (or “Volume” from clip): tabs Original / Voice over / Music; volume sliders and mute toggles; update edl.audio (voiceVolume, musicVolume, musicEnabled, videoTrackMuted, audioTrackMuted, musicTrackMuted). |
| 5.4 Captions sheet | When activeTool === 'captions': list of overlays; add new overlay; per overlay: text input, style preset picker (bold_white_shadow, yellow_caption, minimal_lower), start/end time; delete. Updates edl.overlays. |

#### Phase 6 — Top bar and export

| Task | Description |
|------|-------------|
| 6.1 Top bar | Back (close editor), title “Edit draft” or project name, resolution badge (from edl.output), Save draft (dirty/saving), Export (open Export modal), Undo/Redo (enabled when past/future non-empty), export progress when exporting. |
| 6.2 Export modal | Resolution: HD / 2K / 4K; FPS: 24 / 30 / 60; Color: SDR / HDR. Export button → call handleSaveAndRerender(options) (update EDL output from options, then updateEdl + renderDraft; poll until done). |
| 6.3 Export overlay | When export in progress: full-screen or large overlay with progress bar, optional preview image (if backend provides), “Done” + output video link or Preview when complete; Dismiss. |

#### Phase 7 — Save and close

| Task | Description |
|------|-------------|
| 7.1 Save on close | If dirty on back press, prompt: Save and close / Discard / Cancel; if Save, call updateEdl then navigate back. |
| 7.2 Keyboard (optional) | On mobile, optional: S for split at playhead, Delete for delete selected clip/overlay (when focus not in input). |

---

### 18.7 Web vs mobile: visual and UX gap analysis

This subsection summarizes the **observed differences** between the web video editor and the mobile “Edit draft” screen (as of the current implementation and screenshots). It is the source of truth for what “remaining” means.

#### 18.7.1 Web editor (reference)

- **Top bar:** Close (X), project dropdown (“Project”), Save icon, resolution (e.g. 1920p), Export/upload (blue circular button).
- **Preview:** Fixed-aspect video preview with central play overlay; playhead-synced playback.
- **Playback:** Large play button, time display (current / total), Undo/Redo.
- **Timeline (always visible, prominent):**
  - **Playhead:** White vertical line with circular handle, spanning all tracks.
  - **Time ruler:** Labels in seconds (0s, 1s, 2s, …).
  - **Track order (top → bottom):**
    1. **Text track** (T icon): text overlay blocks (purple), add/manage captions.
    2. **Adjustment track** (sliders icon): single block for color/filters (saturation, contrast, vibrance); click opens Adjust.
    3. **Music track** (speaker): music/SFX block with waveform (purple).
    4. **Voice/video track** (speaker): main **video clip(s)** with thumbnails, integrated waveform, duration label (e.g. “3.5s”), **trim handles** (yellow vertical bars at in/out); selection ring (e.g. yellow border); drag-and-drop reorder.
  - Clicking a clip or overlay selects it and surfaces clip/overlay actions.
- **Bottom toolbar / clip actions:**
  - **When no clip/overlay selected:** Horizontal strip — Volume, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker, **Trim** (Trim disabled until a clip is selected).
  - **When a video clip is selected:** **ClipToolbar** — Split, Edit (trim), Volume, TTS, Copy, Delete; submenu (Slip, Extract, Voice FX, Reverse, Speed, Replace) with some items disabled.
  - **When text overlay selected:** Contextual bar — Edit (Captions), Delete.

#### 18.7.2 Mobile editor (current)

- **Header:** Back, “Edit draft”, 2K badge, Save, Download (Export), Undo, Redo.
- **Preview:** Video player with play button; playback controls (play, time, progress bar).
- **Below playback:** In code, `EdlTimelineTracks` and then the contextual bar (when selection exists), then the bottom toolbar (Adjust, Audio, Captions, Trim when clip selected), then project/timeline text and Save EDL / Render draft. All in one vertical `ScrollView`.
- **Observed in screenshot:** Only three toolbar buttons visible — **Adjust**, **Audio**, **Captions**. No visible timeline (no ruler, no clip blocks, no tracks, no playhead line). No Split, Edit, Volume, TTS, Copy, Delete in view. “Timeline: 3 clips” appears as text only.

#### 18.7.3 Gap summary (what “remaining” means)

| Aspect | Web | Mobile (current) |
|--------|-----|------------------|
| **Timeline visibility** | Always visible; ruler + multiple tracks + playhead. | Implemented in code but inside scroll; can be off-screen; not prominent. |
| **Track order** | Text → Adjust → Music → Voice → Video (5 tracks). | Video → Overlay → Audio placeholder (3 tracks; different order). |
| **Playhead** | Vertical line + handle across all tracks. | Line exists in `EdlTimelineTracks`; may not be visible if timeline is not in view. |
| **Video clips on timeline** | Thumbnails, duration label, trim handles (in/out), selection ring, drag reorder. | Blocks with clip index only (no thumbnails); no trim handles; reorder via Move left/right in bar. |
| **Overlay track** | Text blocks with trim handles when selected. | Text blocks; no in-timeline trim handles (edit in Captions sheet). |
| **Audio track** | Waveform (voice/music). | Placeholder (“Voice”) only. |
| **Adjust track** | Dedicated track; click opens Adjust. | No separate track; Adjust only via toolbar. |
| **Bottom strip (no selection)** | Volume, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker, Trim. | Adjust, Audio, Captions only; Trim appears only when a clip is selected. |
| **Clip selected** | Split, Edit, Volume, TTS, Copy, Delete (and Slip etc. in submenu). | Move left/right, Split, Trim, Duplicate, Delete, Slip (contextual bar); bar only visible when a clip is selected (requires timeline in view). |
| **Overlay selected** | Edit (Captions), Delete. | Edit, Delete (contextual bar). |

---

### 18.8 Remaining work (detailed)

Status: most items **done**. This section lists what was implemented and what is **left** to do.

#### 18.8.1 Timeline visibility and layout — **Done**

- Timeline section with minHeight and title; preview maxHeight so timeline is on-screen. Playhead vertical line across tracks. Ruler with positioned time labels.

#### 18.8.2 Track structure and order — **Done**

- Track order: Text → Adjust → Music → Voice → Video. Dedicated Adjust track (tappable). Separate Music and Voice placeholder tracks.

#### 18.8.3 Video track parity — **Done**

- Clip thumbnails from `resolvedClipUrls`. Duration label on selected clip. Trim handles (left/right) with pan gesture → `setClipTrimInOut`. Selection ring (border). Move left/right reorder.

#### 18.8.4 Overlay (text) track parity — **Done**

- **Trim handles on overlay blocks:** When an overlay is selected, left/right trim handles with pan gesture call `setOverlayTrim` for startSec/endSec. Captions sheet still available for full edit.

#### 18.8.5 Audio track(s) — **Done (placeholder) / Optional (real waveform)**

- Voice track: waveform-style placeholder when `resolvedAudioUrl` is set. Music track: placeholder. Real waveform from decoded audio (e.g. `useAudioPeaks`-style) is optional on RN (would require native or expo-audio decode).

#### 18.8.6 Bottom toolbar and options — **Done**

- Trim visible when clip selected; timeline visible so selection works. Adjust, Audio, Captions, Trim; contextual bar with Move left/right, Split, Trim, Duplicate, Delete, Slip (clip) and Edit, Delete (overlay).

#### 18.8.7 Export and top bar — **Done**

- Export modal: Resolution, FPS, and Color (SDR/HDR) present. Top bar complete.

#### 18.8.8 Summary: what’s done vs remaining

| Item | Status |
|------|--------|
| Timeline visible by default | **Done** |
| Playhead across tracks | **Done** |
| Track order (Text → Adjust → Music → Voice → Video) | **Done** |
| Dedicated Adjust track | **Done** |
| Clip thumbnails | **Done** |
| Duration label on selected clip | **Done** |
| Trim handles on timeline (video) | **Done** |
| Move left/right reorder | **Done** |
| Trim handles on timeline (overlay) | **Remaining (optional)** |
| Voice waveform | **Done (placeholder)**; real decode optional |
| Export Color (SDR/HDR) | **Remaining (optional)** |
| Drag-and-drop reorder on timeline | **Optional**; defer |
| Extra toolbar tools (Links, Filters, etc.) | Defer |

#### 18.8.9 What to do next

- **Done this pass:** Overlay trim handles on timeline; Export Color (SDR/HDR) in Export modal.
- **Later (optional):** Real voice waveform from decoded audio (native/expo-audio); or keep the current placeholder. Drag-and-drop clip reorder on the timeline. Extra toolbar tools (Links, Filters, etc.) if product needs them.

---

### 18.4 Implementation order (recommended)

1. **Phase 1** — Data, API, ensureEdlIds, resolved URLs, undo/redo, editor state.
2. **Phase 2** — Preview area (draft video only), playhead, playback controls (play/pause, seek).
3. **Phase 6.1** — Top bar (Save draft, Export, Undo/Redo) and 6.2–6.3 Export modal + overlay (reuse current render-draft flow, add resolution/fps options).
4. **Phase 3** — Timeline: ruler, video track (clip blocks, thumbnails, select), overlay track, audio track (waveform or placeholder).
5. **Phase 4** — Reorder (drag), trim (handles or sheet), split, duplicate, delete clip; overlay delete; slip mode.
6. **Phase 5** — Trim, Adjust, Audio, Captions sheets.
7. **Phase 7** — Save-on-close prompt.
8. **Phase 2.4 (optional)** — Composite preview from timeline if needed.

---

### 18.5 Files and structure (mobile)

- **Screen:** `mobile/src/screens/EdlEditorScreen.tsx` — expand into full editor container (state, load/save, undo/redo, resolved URLs, pass callbacks to children).
- **Components (new or under e.g. `mobile/src/components/edl/`):** EditorTopBar, PreviewPlayer (or reuse VideoPreviewModal in a framed view), PlaybackControls, TimelineTracks (ruler, video row, overlay row, audio row), ClipToolbar / ContextualActionBar, BottomToolbar (tool buttons), TrimSheet, AdjustSheet, AudioSheet, CaptionsSheet, SlipModeSheet, ExportModal, ExportOverlay. Port or adapt web logic from `frontend/src/components/builder/editor/`.
- **Logic (shared or ported):** `ensureEdlIds`, `splitTimelineAtPlayhead`, `parseS3Key`; reorderClips, setClipTrim, setClipSlip, setClipSlipInAbsolute, deleteClip, duplicateClip, setOverlayTrim, deleteOverlay (and add overlay). Same formulas for startSec recomputation after any timeline change.
- **Store:** Optional `mobile/src/store/edlEditorStore.ts` (Zustand) mirroring web’s selectedBlock, activeTool, saveStatus, slipMode, slipClipId, slipOriginalInSec.

---

### 18.6 Summary

| Area | Web | Mobile (current) | Remaining (optional) |
|------|-----|------------------|----------------------|
| Load/save EDL | getEdl, updateEdl, ensureEdlIds | Same | — |
| Undo/redo | past/future stacks | Same (header buttons) | — |
| Timeline | Tracks, thumbnails, trim handles, DnD, playhead | Visible; Text→Adjust→Music→Voice→Video; thumbnails; duration label; clip & overlay trim handles (pan); playhead; Move left/right | DnD reorder (optional) |
| Overlays | List, add, edit, trim on timeline, style preset | Captions sheet + overlay track blocks; style presets; overlay trim handles on timeline | — |
| Audio | Voice/music volumes, mutes, waveform | Audio sheet; Voice/Music tracks; waveform placeholder when URL set | Real waveform from decode (optional) |
| Color | Adjust track + sheet | Adjust track + sheet | — |
| Preview | Draft/composite, playhead, seek | Draft video, playhead, seek bar | Composite from timeline (optional) |
| Export | Resolution, fps, color; render; progress | Resolution, fps; render; progress | Color (SDR/HDR) if backend supports |
| Tools / toolbar | Many tools; ClipToolbar when clip selected | Adjust, Audio, Captions, Trim; contextual bar (Move L/R, Split, Trim, Duplicate, Delete, Slip; overlay Edit, Delete) | — |

**What to do next:** See **§18.8.9**. EDL editor parity is complete; remaining work is optional (real voice waveform, drag-and-drop reorder, extra tools).

---

### 18.9 Mobile EDL editor UX alignment: what to adjust, modify, remove

This section answers why certain elements exist on mobile, why the mobile editor still feels different from the web app, and **what to remove, adjust, or modify** so the mobile video editor matches the web app. **No code implementation** — planning only.

#### 18.9.1 Why do we need “Save EDL” and “Render draft” buttons (at the bottom)?

- **Current state:** Mobile has **two places** for the same actions:
  1. **Header:** Save icon (floppy disk) and Download icon (Export). These correspond to “save EDL” and “render/export” on web.
  2. **Bottom of screen:** Two large buttons — “Save EDL” and “Render draft” — that duplicate the same actions.

- **Web behavior:** The web editor has **only** the top bar for these actions: Save (floppy) and Export (upload icon). There are no duplicate primary buttons in the body.

- **Conclusion:** The bottom “Save EDL” and “Render draft” buttons are **redundant** and make the layout differ from web. They also push the timeline and tools down and consume space.

- **Recommendation — REMOVE:**
  - Remove the two bottom buttons (“Save EDL” and “Render draft”) from the main scroll content.
  - Keep **only** the header Save icon (save EDL) and Download/Export icon (opens Export modal → render draft). Document that “Export” in the header is the single entry point for render/export, matching web.

#### 18.9.2 Why do we need “Timeline: 3 clips” and the project name (as shown)?

- **Current state:** Mobile shows in the body:
  - **“Project: cmmdz3udo000bd2y7ukt7mn4q”** — the raw project ID.
  - **“Timeline: 3 clips”** — a text summary of clip count.

- **Web behavior:** The web editor does **not** show a raw project ID in the main content. It has a **“Project”** dropdown in the top bar (user-facing project name or selector). The web does **not** show “Timeline: X clips” as standalone text; the timeline itself is the source of that information.

- **Conclusion:**
  - Showing the **project ID** in the body is not user-friendly and does not match web. If we show project at all, it should be a label/name in the top bar (e.g. “Project” dropdown or project title), not an internal ID in the content area.
  - **“Timeline: X clips”** is redundant when the timeline is visible; users can see the clips on the timeline. It adds clutter and is not present on web.

- **Recommendation — REMOVE or RELOCATE:**
  - **Remove** the line “Timeline: X clips” from the main content.
  - **Remove** the line “Project: &lt;projectId&gt;” from the main content. Optionally, **adjust** the header to show a “Project” label or project name (e.g. from `projectsApi.get(projectId)` if the API returns a name) in the top bar instead of or next to “Edit draft,” so mobile aligns with web’s project dropdown area. If project name is not available, do not show the raw ID in the primary view.

#### 18.9.3 What to adjust so the mobile editor matches the web app

| Area | Web | Mobile (current) | Action |
|------|-----|------------------|--------|
| **Save / Export** | Only in top bar (Save icon, Export icon). | Header icons + two large bottom buttons. | **Remove** bottom “Save EDL” and “Render draft” buttons. Rely on header only. |
| **Project** | “Project” dropdown in top bar (name/selector). | “Project: &lt;id&gt;” in body. | **Remove** project ID from body. **Adjust** header to show “Project” or project name in top bar if API supports it. |
| **Timeline summary text** | None in body. | “Timeline: 3 clips” in body. | **Remove** “Timeline: X clips” line. |
| **Top bar order/labels** | Close, Project, Save, resolution, Export. | Back, “Edit draft”, 2K, Save, Download, Undo, Redo. | **Adjust** to match web order and semantics: ensure Save and Export are clearly the same as web; consider “Project” in top bar. |
| **Bottom toolbar (no selection)** | Many tools: Volume, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker, Trim. | Adjust, Audio, Captions (+ Trim when clip selected). | **Adjust** (optional): align labels and order with web where applicable (e.g. Trim only when clip selected on both). Mobile may keep a reduced set; avoid adding redundant body buttons. |
| **Clip toolbar (when clip selected)** | Split, Edit, Volume, TTS, Copy, Delete (and Slip in submenu). | Move left/right, Split, Trim, Duplicate, Delete, Slip. | **Adjust** (optional): consider renaming “Trim” to “Edit” for clip to match web; “Duplicate” vs “Copy” is acceptable. Ensure this bar is visible when a clip is selected and timeline is in view. |
| **Playback** | Large play button, time (e.g. 0:00.0 / 0:05.4), Undo/Redo near playback. | Play, time, seek bar, Undo/Redo in header. | **Adjust** (optional): place Undo/Redo next to playback area if desired for parity; not strictly required. |
| **Timeline prominence** | Timeline is the main focus below playback; no extra text block. | Timeline + “Timeline” title + meta text + bottom buttons. | **Modify** layout so that after removing the meta text and bottom buttons, the timeline and toolbars are the primary content below playback, matching web structure. |

#### 18.9.4 What to modify (layout and structure)

- **Content order (top to bottom):** Match web: **Header** → **Preview** → **Playback controls** → **Timeline** (ruler + tracks) → **Contextual bar** (when clip/overlay selected) → **Bottom toolbar** (tool strip). No “Project: …”, no “Timeline: X clips”, no “Save EDL” / “Render draft” buttons in the scroll content.
- **Single source of truth for save and export:** All save and export actions live in the header (and Export modal). No duplicate primary buttons in the body.
- **Project identity:** Only in header (e.g. “Edit draft” or project name / “Project” control), not raw ID in body.

#### 18.9.5 What to remove (summary)

1. **Remove** the two bottom buttons: “Save EDL” and “Render draft.”
2. **Remove** the text line “Timeline: X clips.”
3. **Remove** the text line “Project: &lt;projectId&gt;” from the main content.

#### 18.9.6 What to add or change for parity (summary)

1. **Header:** Ensure Save and Export (Download) are the only primary actions for save and render; optionally add “Project” dropdown or project name in top bar.
2. **Layout:** After removals, the main content is: preview → playback → timeline → contextual bar (when selection) → bottom toolbar. No meta block between toolbar and timeline.
3. **Optional:** Align bottom toolbar and clip toolbar labels/order with web (e.g. Edit, Volume, TTS, Copy, Delete, Slip) and consider Undo/Redo placement.

Implementing the removals and adjustments in §18.9.5 and §18.9.6 will make the mobile video editor **match the web app** in structure and avoid redundancy.

#### 18.9.7 Implementation status and why the UI might still look old

- **Code status:** The removals in §18.9.5 have been implemented in `EdlEditorScreen.tsx`: the lines "Project: {projectId}", "Timeline: X clips", and the two buttons "Save EDL" and "Render draft" are **no longer in the source**. The scroll content ends with the bottom toolbar (Adjust, Audio, Captions, Trim). A search for those strings in the mobile app returns no matches.
- **If you still see the old UI (Project, Timeline: 3 clips, Save EDL, Render draft):** The app is almost certainly running a **cached or old JavaScript bundle**. The device/simulator may not have loaded the latest code.
- **What to do:**
  1. **Reload the bundle:** In the Expo/Metro terminal press **`r`** to reload, or shake the device and choose "Reload."
  2. **Clear Metro cache:** Stop the bundler (Ctrl+C), then run **`npx expo start -c`** (the `-c` clears the cache). Open the app again.
  3. **Fully close the app:** Force-quit the app on the device/simulator, then reopen it so it fetches the new bundle.
  4. **Development build:** If using a dev client, ensure the dev server is the one that was started after the code change; if the app was opened via an old tunnel or URL, it may be serving an old bundle.
- **How to confirm the new UI:** After a cache-clear and reload, the Edit draft screen should show: header (Back, Edit draft, 2K, Save, Download, Undo, Redo) → video preview → playback → timeline → contextual bar (when a clip/overlay is selected) → toolbar (Adjust, Audio, Captions, Trim). There should be **no** "Project: …", **no** "Timeline: X clips", and **no** "Save EDL" or "Render draft" buttons in the scroll area.

#### 18.9.8 Make mobile exactly like web: update / improve / remove checklist

Based on side‑by‑side comparison of the web and mobile video editor screens, use this checklist so the mobile app matches the web app. **Planning only** — no implementation in this section.

---

**REMOVE (redundant or not on web)**

| # | Item | Notes |
|---|------|--------|
| R1 | Bottom “Save EDL” and “Render draft” buttons | Already removed in code. If still visible, clear bundle cache. |
| R2 | Body text “Project: &lt;projectId&gt;” | Already removed. |
| R3 | Body text “Timeline: X clips” | Already removed. |
| R4 | Any duplicate “Timeline” section title if it adds clutter | Web has no section title above the timeline; optional removal. |
| R5 | Redundant entry points for the same action | Only one way to Save (header), one way to Export (header → modal). |

---

**UPDATE (align behavior and layout with web)**

| # | Item | Web | Mobile today | Action |
|---|------|-----|--------------|--------|
| U1 | **Header left** | Close (X), then “Project” dropdown | Back, then “Edit draft” | Consider: Back is OK for mobile; add a “Project” control or project name in the top bar (e.g. replace or supplement “Edit draft” with project name from API) so it matches web’s project dropdown area. |
| U2 | **Header center/right** | Project, Save, resolution (1920p), Export | Edit draft, 2K, Save, Download, Undo, Redo | Keep Save and Export in header only. Show resolution (2K/1920p) clearly. Undo/Redo can stay in header or move next to playback to match web. |
| U3 | **Content order** | Header → Preview → Playback → Timeline → Bottom bar | Same in code; ensure no extra blocks. | Ensure order is strictly: Preview → Playback → Timeline (ruler + 5 tracks) → Contextual bar (when selection) → Bottom toolbar. No meta text or buttons in between. |
| U4 | **Bottom bar when nothing selected** | Volume, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker, Trim (Trim disabled) | Adjust, Audio, Captions, Trim (when clip selected) | Update so the bottom bar mirrors web: show a strip that includes Split, Edit, Volume, TTS, Copy, Delete (and Trim), with Trim (and optionally others) disabled when no clip is selected. Optionally keep a reduced set (e.g. Adjust, Audio, Captions, Trim) but align labels and order with web where possible. |
| U5 | **Bottom bar when clip selected** | Split, Edit, Volume, TTS, Copy, Delete (+ Slip in submenu) | Contextual bar: Move left/right, Split, Trim, Duplicate, Delete, Slip | Update so the same strip shows clip actions: Split, Edit (trim), Volume, TTS, Copy, Delete, Slip. Consider renaming “Trim” to “Edit” for the clip case and “Duplicate” to “Copy” to match web. Move left/right can remain as extra. |
| U6 | **Time display** | “0:00.0 / 0:05.4” (one decimal) | “0:00 / 0:08” | Update playback time format to match web (e.g. one decimal place) if desired. |
| U7 | **Playhead and ruler** | White vertical playhead with handle; ruler 0s, 1s, 2s, 3s | Blue playhead; ruler present | Update playhead to white (or web color) and ensure ruler styling matches web. |

---

**IMPROVE (visual and UX parity)**

| # | Item | Web | Mobile today | Action |
|---|------|-----|--------------|--------|
| I1 | **Timeline visibility** | Timeline is the main focus below playback; always in view. | Timeline in scroll; can be off-screen. | Improve: ensure timeline is above the fold (e.g. compact preview or fixed timeline height) so it’s always visible like web, without scrolling. |
| I2 | **Track order and content** | Text → Adjust → Music → Voice → Video; each track has clear blocks. | Same order in code; ensure UI matches. | Improve: verify all five tracks render in this order with correct icons and block styling (e.g. purple text block, grey adjust block, waveform placeholders, video thumbnails). |
| I3 | **Video clip on timeline** | Thumbnail, yellow border when selected, yellow trim handles (left/right), duration label (e.g. “3.5s”). | Thumbnails, duration badge, trim handles (blue). | Improve: use yellow (or web) accent for selection border and trim handles; ensure duration label is visible on selected clip. |
| I4 | **Project in header** | “Project” dropdown (name or selector). | “Edit draft” only. | Improve: show project name in header (e.g. from `projectsApi.get(projectId)` if API returns a name), or a “Project” tappable label, so mobile matches web’s project identity in the top bar. |
| I5 | **Audio tracks** | Real waveforms (purple) on music and voice tracks. | Placeholder or simple bars. | Improve: when backend/URL supports it, show real waveform on voice (and music) track to match web; otherwise keep placeholder but style consistently. |
| I6 | **Overlay track** | Text blocks (purple) with trim handles when selected. | Text blocks; trim handles implemented. | Improve: ensure overlay blocks use same purple (or web) styling and trim handles are visible when overlay is selected. |
| I7 | **Close / back** | X (close) at far left. | Back arrow. | Improve: on mobile, Back arrow is acceptable; ensure it closes the editor or returns to previous screen like web’s X. No change required unless product wants an X icon. |

---

**Summary**

- **Remove:** Redundant bottom Save EDL / Render draft (done), project ID and “Timeline: X clips” in body (done), and any remaining duplicate UI.
- **Update:** Header (project name/dropdown, order), content order, bottom bar content and labels (Split, Edit, Volume, TTS, Copy, Delete, Slip; Trim when no selection disabled), time format, playhead/ruler styling.
- **Improve:** Timeline always visible, track order and block styling, yellow selection/trim on clips, project name in header, real waveforms on audio tracks, overlay block styling.

Implementing this checklist will make the mobile video editor **exactly like** the web app in structure, actions, and appearance.

---

### 18.10 Mobile video editor: modern UX refactor (reference design)

**Purpose:** Refactor and upgrade the mobile video editor UI/UX to match a **modern mobile editor** reference design. Do **not** redesign backend or data structures; only improve UI, layout, timeline interaction, and visual consistency.

**Reference:** Centered video preview, full layered timeline with stacked tracks, clip thumbnails, text/audio layers, track visibility toggles, clear playhead, bottom editing toolbar, export in header. Current state: small preview, black padding, overlay on video, simple numbered clips, thin playhead, minimal toolbar.

**Out of scope:** Backend logic, Save EDL / Render Draft / clip data structures (keep as-is).

---

#### 18.10.1 Video preview area (adjust)

| Current problem | Fix required |
|-----------------|--------------|
| Preview too small | Use vertical 9:16 canvas; size/constrain so preview feels primary. |
| Black area above video | Remove unnecessary black padding; center content in canvas. |
| Video not centered | Center the video preview **vertically** inside its canvas. |
| Preview overlay blocks video | Overlay controls must **not** cover video content. |
| Play button placed awkwardly | Move playback controls **below** the preview area (no overlay on video). |

**Target structure (top to bottom):**

1. Top toolbar (back, title, resolution, Save, Export, Undo, Redo)
2. **Video preview** (centered, 9:16, no overlays on content)
3. **Playback controls** (separate row below preview)
4. Timeline (layered tracks)

---

#### 18.10.2 Playback controls (adjust)

| Current issue | Update |
|---------------|--------|
| Progress bar thin | Make progress bar **thicker** and **higher contrast**. |
| Time indicator small | Increase size/readability of current time and duration. |
| Play button floats randomly | Use a single, unified playback row. |

**Playback row layout (left to right):**

`[Play]  Current time / Total duration  -------- progress bar --------  [Undo] [Redo]`

Example: `[Play] 00:00 / 00:18 --------progress------ [Undo] [Redo]`

- One horizontal row; no overlay on the video.
- Undo/Redo can sit in this row (or remain in header per §18.9).

---

#### 18.10.3 Timeline system (major upgrade)

| Current | Target |
|---------|--------|
| Simple numbered clips (1, 2, 3) | **Layered timeline** with multiple track types. |
| No thumbnails | Clip **thumbnail previews**; width = duration. |
| No stacked layers / weak track separation | Clear **stacked tracks** with labels and separation. |

**Track types (order):**

1. **Adjust / Filters** — single block or “Color & filters” bar
2. **Text** — text overlay blocks with preview and duration
3. **Audio** — music track (waveform or placeholder)
4. **Voice** — voice track (waveform or placeholder)
5. **Video clips** — thumbnail per clip; width proportional to duration

**Layout example:**

```
Adjust track   --------------------
Text track     --------------------
Audio track    --------------------
Voice track    --------------------
Video track    [thumb][thumb][thumb][+]
```

Each clip: **thumbnail preview** + **width proportional to duration**. Add **"+"** button after last video clip to add more (opens media picker).

---

#### 18.10.4 Playhead (adjust)

| Current | Improve |
|---------|--------|
| Thin, low visibility | **Thicker** vertical line; **blue** highlight. |
| — | Visible **across all tracks**. |
| — | **Snap** playhead to timeline grid. |

---

#### 18.10.5 Clip blocks (adjust)

| Current | Replace with |
|---------|--------------|
| [1] [2] [3] numbered blocks | **Video frame thumbnails** per clip. |
| Equal or arbitrary width | Width = **clip duration** (proportional). |
| No add affordance | **"+"** button after last clip → open media picker. |

---

#### 18.10.6 Track visibility buttons (add)

Add small **icons on the left** of each track to toggle visibility (e.g. eye for visual tracks, speaker for audio).

| Icon type | Track |
|-----------|--------|
| T (text) | Text track |
| 🎚 Filter | Adjust track |
| 🎵 Music | Music / Audio track |
| 🎙 Voice | Voice track |
| 🎬 Video | Video clips track |

Example: `T  Text track` … `🎬 Video track` with toggle state (visible/hidden).

---

#### 18.10.7 Bottom toolbar (restructure)

| Current | Replace with (reference) |
|---------|---------------------------|
| Adjust, Audio, Captions (minimal) | **Audio, Text, Voice, Links, Captions, Filters, Adjust** (or equivalent order). |
| — | **Icons + labels**; **scrollable** horizontal toolbar. |

Keep existing actions; only restructure order, labels, and add entries (e.g. Links, Filters) where they map to existing EDL/backend concepts.

---

#### 18.10.8 Remove unused UI

Remove from the **main editing screen**:

- Project ID text
- “Timeline: X clips” label
- Save EDL button from body (keep Save in **top toolbar** only)

Save/export live in the **top toolbar** and/or a dedicated save/export step; no duplicate primary buttons in the scroll content.

---

#### 18.10.9 Export flow (move)

- **Export** in **top toolbar**, top-right area.
- Pattern: `4K  Export` (resolution indicator + Export button), like reference.
- No “Render draft” or “Export” as a large button in the body.

---

#### 18.10.10 Timeline interaction (add)

Timeline must support:

| Interaction | Requirement |
|-------------|-------------|
| Horizontal scroll | Scroll timeline horizontally to see full duration. |
| Pinch zoom | Optional: pinch to zoom timeline scale. |
| Drag playhead | Drag playhead to seek. |
| Tap clip | Tap clip to **select**; selected clip **highlighted**. |
| Drag clip | Drag clip to **reorder** (video track). |

---

#### 18.10.11 Text layer system (add)

- **Text track** with blocks per overlay.
- Each block: **text preview** (e.g. “Wait until you see this…”) + **duration** (width or label).
- **Tap text block** → open caption/caption editor (existing Captions sheet or equivalent).

---

#### 18.10.12 Audio layers (add)

- **Music track** and **Voice track** (already present as placeholders).
- Each audio block: **waveform preview** when data/URL available; otherwise placeholder (e.g. bars or label).
- No backend change; only UI representation.

---

#### 18.10.13 Clip add button (add)

- **"+"** button **after** the last video clip on the video track.
- On tap: **open media picker** (or equivalent “add clip” flow).
- Backend: use existing add-clip flow if any; otherwise define as “add clip” action that appends to timeline (implementation detail).

---

#### 18.10.14 UI styling

Maintain:

- **Dark theme**
- **Rounded blocks**
- **Soft shadows** where appropriate
- **Blue playhead**
- **Color-coded tracks**

Suggested colors (align with reference):

| Track / element | Color |
|-----------------|--------|
| Video track (clips) | Blue accent |
| Text track | Purple |
| Audio track | Pink |
| Voice track | Orange |
| Adjust / Filters | Gray |

---

#### 18.10.15 Performance

- Use **FlatList** or recycler for timeline tracks where applicable.
- **Memoized** clip/block components to avoid unnecessary re-renders.
- **Virtualized** timeline rendering so many clips remain smooth.
- Do not change data shape or backend; only optimize render and scroll.

---

#### 18.10.16 Do not change

- **Backend logic** — unchanged.
- **Save EDL** — same API and behavior; only move UI to toolbar.
- **Render draft** — same API; only move entry point to Export in header.
- **Clip data structure** — keep existing EDL/clip model.

Only **UI and interaction** are upgraded to match the reference design.

---

#### 18.10.17 Final deliverable (summary)

Refactored React Native video editor with:

- Modern preview layout (centered, 9:16, no overlay on video)
- Playback controls below preview (unified row: Play, time, progress, Undo, Redo)
- Layered timeline (Adjust, Text, Audio, Voice, Video)
- Clip thumbnails; width = duration; “+” to add clip
- Playhead: thicker, blue, across all tracks, snap to grid
- Track visibility toggles (icons on left)
- Bottom toolbar: Audio, Text, Voice, Links, Captions, Filters, Adjust (icons + labels, scrollable)
- Export in top toolbar (e.g. 4K + Export)
- Text blocks with preview + duration; tap → caption editor
- Audio layers with waveform (or placeholder)
- Timeline: horizontal scroll, drag playhead, tap/drag clips, selection highlight
- Performance: memoized blocks, virtualized timeline where needed

---

#### 18.10.18 Implementation status (§18.10 modern UX refactor)

As of the last update, the following items from §18.10 have been **implemented** in the mobile app. Use this section to track what is done and what remains optional.

| § | Item | Status | Notes |
|---|------|--------|--------|
| 18.10.1 | Video preview area | **Done** | 9:16 canvas, no overlay on video; playback row below preview. `EdlEditorScreen`: `previewWrap` with `aspectRatio: 9/16`. |
| 18.10.2 | Playback controls | **Done** | Unified row: Play, time (0:00.0 format), thicker progress bar, Undo, Redo. Below preview. |
| 18.10.3 | Timeline system | **Done** | Layered tracks: Text, Adjust, Music, Voice, Video. `EdlTimelineTracks`. |
| 18.10.4 | Playhead | **Done** | Thicker (4px), blue, across all tracks; snap to 0.5s grid. Ruler **tap to seek** (Pressable). |
| 18.10.5 | Clip blocks | **Done** | Thumbnails; width = duration; number overlay hidden when thumbnail present; “+” after clips. |
| 18.10.6 | Track visibility | **Done** | Eye/EyeOff (text, adjust, video), Volume2/VolumeX (music, voice); dimmed row when hidden. |
| 18.10.7 | Bottom toolbar | **Done** | Audio, Text, Voice, Links, Captions, Filters, Adjust, Trim; scrollable; icons + labels. |
| 18.10.8 | Remove unused UI | **Done** | No Project ID / “Timeline: X clips” / body Save EDL or Render draft. |
| 18.10.9 | Export in header | **Done** | Resolution badge + Export button (icon + label) in top toolbar. |
| 18.10.10 | Timeline interaction | **Done** | Horizontal scroll; drag playhead to seek; tap clip to select; **drag clip to reorder**; ruler tap to seek. Pinch zoom **not** implemented (optional). |
| 18.10.11 | Text layer | **Done** | Overlay blocks with text preview (24 chars), duration badge when selected; tap → Captions sheet. |
| 18.10.12 | Audio layers | **Done** | Music (pink placeholder), Voice (orange placeholder + waveform when `resolvedAudioUrl`). |
| 18.10.13 | Add-clip “+” | **Done** | “+” after last video clip; `onAddClip` (currently alert; can wire to media picker). |
| 18.10.14 | UI styling | **Done** | Dark theme; color-coded tracks (gray adjust, pink music, orange voice, purple text, blue/yellow clip accent). |
| 18.10.15 | Performance | **Done** | `React.memo` on ClipBlock, OverlayBlock, WaveformPlaceholder. |
| 18.10.16 | Do not change | — | Backend, Save EDL/Render APIs, clip data structure unchanged. |
| 18.10.19 | Layout spacing (Timeline ↔ toolbar) | **Done** | `timelineWrap` no flex:1, marginBottom: 6; `bodyContent` paddingBottom: 0; `EdlTimelineTracks` wrap minHeight only; toolbar paddingTop: 8. |
| 18.10.20 | Video import and timeline thumbnail UX | **Partial** | Incremental thumbnails + ClipBlock “Preparing…” done; loading popup and placeholder clip not yet. |
| 18.10.21 | Add new video clip UX (loading popup + floating “+”) | **Done** | Loading popup + progress + cancel done; floating “+” on right of video track (viewport-right) done. **Undone:** Show 100% before closing (progress stops at 85% — see §18.10.21 below). |
| 18.10.22 | Adjust panel refactor (reference design) | **Done** | Replace Adjust modal with reference-style bottom sheet: drag handle, “Apply to all clips” row, tabs (Adjust \| WB \| HSL \| Style), sliders, scrollable list, confirm. See §18.10.22. |
| 18.10.22.1 | Adjust sheet layout fix (no overlap) | **Done** | Four sections (handle, apply row, tabs row, scroll); column wrapper; apply row flexShrink; spacing 12–16 between sections; safe area. See §18.10.22.1. |
| 18.10.22.2 | Adjust sheet: horizontal tabs + visible sliders | **Done** | Single column wrapper (sheetContent); apply row with radio + label; tabs use tabSection (flexDirection: row); scroll with paddingBottom + insets. See §18.10.22.2. |

**Optional / not implemented**

- **Pinch zoom** on timeline (§18.10.10): optional; would require scale state and gesture.
- **Real waveform** for audio (§18.10.12): voice uses placeholder bars when URL present; real peak data would need backend/decoder support.
- **Media picker** for “Add clip” (§18.10.13): currently shows alert; can be wired to expo-image-picker or similar when required.

**Key files**

- `mobile/src/screens/EdlEditorScreen.tsx` — Layout, playback row, toolbar, export header, track visibility state, snap, reorder, add-clip handler.
- `mobile/src/components/edl/EdlTimelineTracks.tsx` — Timeline, playhead, tracks, clip/overlay blocks, visibility toggles, waveform, ruler tap-to-seek, drag-to-reorder, “+” button.
- `mobile/src/components/edl/ExportModal.tsx` — Resolution, FPS, Color (SDR/HDR); `exportColor` state.

---

#### 18.10.19 Layout spacing: Timeline ↔ Bottom toolbar (fix)

**Purpose:** Remove the large empty vertical space between the timeline area and the bottom editing toolbar (Voice, Links, Captions, Filters, Adjust, Trim) so the UI feels compact and matches modern mobile editors (CapCut / TikTok / Instagram Edits).

**Problem**

- A large dark empty gap appears between the timeline and the bottom toolbar.
- The gap makes the editor feel disconnected and wastes screen area.
- The toolbar should sit directly below the timeline with only a small margin (8–12px).

**Investigation (root cause)**

| Location | Current value | Effect |
|----------|----------------|--------|
| **EdlEditorScreen** `styles.body` | `flex: 1` | Body fills viewport below header. |
| **EdlEditorScreen** `styles.bodyContent` | `flex: 1`, `paddingHorizontal: 16`, `paddingTop: 12`, `paddingBottom: 12` | Content column expands; 12px bottom padding. |
| **EdlEditorScreen** `styles.timelineWrap` | `flex: 1`, `minHeight: 160` | **Main cause:** Timeline container grows to fill all remaining space. Timeline content (ruler + tracks) only needs ~140–200px; the rest of `timelineWrap` is empty → large gap above toolbar. |
| **EdlTimelineTracks** `styles.wrap` | `flex: 1`, `minHeight: 140` | Timeline component is also flex-grow; reinforces “fill space” and doesn’t constrain height to content. |
| **EditorBottomToolbar** `styles.container` | `paddingTop: 10`, `paddingBottom: insets.bottom` | 10px top padding; safe-area bottom already applied. |

**Layout order (already correct)**

```
EditorScreen (container)
 ├ Header (TopBar)
 ├ body (flex: 1)
 │   └ bodyContent (flex: 1, padding)
 │        ├ VideoPreview (previewWrap)
 │        ├ PlaybackControls (playbackRow)
 │        ├ Timeline (timelineWrap → EdlTimelineTracks)
 │        └ EditorBottomToolbar
```

**Required fixes (implementation checklist)**

1. **Remove unnecessary vertical spacing**
   - Inspect all containers between `EdlTimelineTracks` and `EditorBottomToolbar`: `timelineWrap`, `bodyContent` padding.
   - Remove or reduce large margins/padding (e.g. avoid `flex: 1` on timeline container so it doesn’t create a stretch gap).

2. **Timeline container (`timelineWrap`)**
   - **Do not** use `flex: 1` on the timeline wrapper if the goal is “toolbar directly below timeline.” Use only the height the timeline needs:
     - Option A: Remove `flex: 1` from `timelineWrap`; keep `minHeight: 160` so the timeline has a minimum height but does not expand to fill space.
     - Option B: Keep a single flex area (e.g. bodyContent with `flex: 1`) but ensure the timeline section does not use `flex: 1` so it shrinks to content height and the toolbar sits immediately below.
   - Avoid `justifyContent: 'space-between'` or empty flex spacers between timeline and toolbar.

3. **Timeline component (`EdlTimelineTracks` wrap)**
   - Consider changing `wrap` from `flex: 1, minHeight: 140` to a fixed or content-driven height (e.g. `minHeight: 140` only, no `flex: 1`) so the timeline uses only the height it needs. If the timeline must still “fill” remaining space for other reasons, document that and only reduce the gap by other means (e.g. reducing padding).

4. **Spacing between timeline and toolbar**
   - Final spacing between timeline and bottom toolbar: **8–12px max** (e.g. `marginTop: 8` on toolbar container or `marginBottom: 8` on timeline wrapper, plus any minimal padding).
   - Reduce `bodyContent` `paddingBottom` if it adds unnecessary space above the toolbar (e.g. 12 → 0 or 4 for the bottom only).

5. **Bottom toolbar positioning**
   - Keep toolbar in-flow directly below the timeline in the flex column (no change to structure).
   - Keep `EditorBottomToolbar` safe-area aware: `paddingBottom: insets.bottom` (already implemented).
   - Do **not** change toolbar design or icons; only fix the vertical gap.

6. **Do not**
   - Change toolbar design, icons, or behavior.
   - Add new UI; only adjust layout and spacing.

**Expected result**

- Timeline content ends, then **8–12px** spacing, then the bottom editing toolbar.
- No large empty dark area between them.
- Editor feels compact like modern mobile editing apps.

**Files to touch**

- `mobile/src/screens/EdlEditorScreen.tsx` — `styles.bodyContent`, `styles.timelineWrap`; optionally layout order if any wrapper is removed.
- `mobile/src/components/edl/EdlTimelineTracks.tsx` — `styles.wrap` (optional, if timeline height should not grow).
- `mobile/src/components/edl/EditorBottomToolbar.tsx` — only if adjusting `paddingTop` to contribute to the 8–12px gap (e.g. reduce from 10 to 8).

**Status:** Implemented. `timelineWrap` uses only `minHeight: 160` and `marginBottom: 6`; `EdlTimelineTracks` wrap uses only `minHeight: 140`; `EditorBottomToolbar` `paddingTop: 8`; `bodyContent` `paddingBottom: 0`.

---

#### 18.10.20 Video import and timeline thumbnail UX

**Purpose:** Fix the add-video flow so the user sees clear loading feedback while a video is imported/processed, and so newly added clips show thumbnails in the timeline instead of appearing as empty blocks. No invisible waiting, no “frozen” feeling, no empty clip without explanation.

**Problems (current behavior)**

1. **No loading feedback when adding a video**  
   After the user selects a video from the media picker, `mediaApi.upload()` runs (often several seconds). `addClipLoading` is set to `true` in `EdlEditorScreen` but is **never passed to any UI**. It is only used to guard the callback (`if (addClipLoading) return`). So the screen looks idle and the app feels frozen until the upload finishes.

2. **New clip appears without thumbnail**  
   When a new clip is appended to the timeline:
   - The clip is added with `clipUrl: res.key` (S3 key).
   - `resolvedClipUrls` is updated by an effect that resolves S3 keys to presigned URLs (`storageApi.playUrl(key)`). Until that completes, the new clip has no playable URL.
   - `resolvedThumbnailUrls` is driven by an effect that runs when `resolvedClipUrls` (and `edl.timeline.length`) change. It calls `VideoThumbnails.getThumbnailAsync(url, { time: 0 })` for **every** clip in sequence and only then calls `setResolvedThumbnailUrls(urls)`. So:
     - There is a delay until the new clip’s presigned URL is available.
     - Thumbnail generation runs for all clips (including the new one) and updates state only when **all** are done, so the new clip can stay “empty” (no thumbnail, and often no `playableUrl` yet) for several seconds.
   - In `ClipBlock`, when both `thumbnailUri` and `playableUrl` are falsy, only the clip index number is shown (e.g. “2”). There is no “loading” or “preparing” state, so the block looks like an empty or placeholder clip.

**Investigation summary (root causes)**

| Area | Current implementation | Issue |
|------|------------------------|--------|
| **Add-clip loading state** | `addClipLoading` in `EdlEditorScreen` set true before upload, false after. | State is never passed to timeline or add button; no spinner, no disabled state, no “Loading…” label. |
| **Timeline during import** | Timeline shows existing clips only; new clip appears only after `updateEdl({ timeline })` when upload has finished. | No temporary “loading” placeholder clip; user sees no change until the real clip is inserted. |
| **Clip URL resolution** | Effect on `edl?.timeline` resolves each `clipUrl` (S3 → presigned) and sets `resolvedClipUrls`. | New clip’s URL is not available until this effect runs and `storageApi.playUrl(newKey)` completes. |
| **Thumbnail generation** | Effect on `edl?.timeline?.length` and `resolvedClipUrls` loops over all clips, calls `getThumbnailAsync` for each, then sets `resolvedThumbnailUrls` once. | New clip gets a thumbnail only after (1) its presigned URL exists and (2) all thumbnails (including previous clips) are generated. No per-clip “thumbnail loading” or incremental update. |
| **ClipBlock when no thumbnail** | Renders index number in `clipLabelOverlay` when `!thumbnailUri && !playableUrl`. | No distinction between “loading” and “failed / no media”; no shimmer or spinner. |

**Suggested fixes (do not implement in this pass — planning only)**

1. **Expose and use add-clip loading state**
   - Pass `addClipLoading` (or a derived “isAddingClip” flag) from `EdlEditorScreen` into the timeline or the component that renders the add-clip “+” button.
   - **Options:**  
     - Show a loading spinner (e.g. `ActivityIndicator`) on or next to the “+” button and disable the button while `addClipLoading` is true.  
     - Or show a small overlay near the video track (e.g. “Loading video…” / “Preparing clip…”) while importing.
   - Ensure the user cannot trigger add-clip again while a previous import is in progress (already guarded in code; make it visible via disabled button or overlay).

2. **Temporary loading placeholder clip**
   - While `addClipLoading` is true (and optionally before the real clip is appended), show a **temporary placeholder** in the video track where the new clip will appear:
     - E.g. a gray/dark block with the same approximate width (e.g. default duration like 5s × pixelsPerSecond) or a fixed min width.
     - Content: “Loading…” or “Preparing clip…” text and an animated shimmer or spinner.
   - Implementation approach: either (a) pass `addClipLoading` and optional “pending clip duration” into `EdlTimelineTracks` and render a synthetic “loading” block at the end of the video track, or (b) optimistically append a “placeholder” clip to the timeline (with a flag like `isPlaceholder: true`) and replace it with the real clip when upload + EDL update complete. Option (a) avoids mutating EDL with a fake clip; option (b) keeps a single source of truth for “something is at the end” but requires replacing the placeholder in state.
   - When the real clip is added via `updateEdl({ timeline })`, remove or replace the placeholder so the real clip (with thumbnail once ready) is the only block at that position.

3. **Thumbnail generation for new clips**
   - **Ensure new clips get thumbnails:** The existing effect that generates thumbnails from `resolvedClipUrls` already runs when the new clip’s URL appears in `resolvedClipUrls`. If thumbnails still do not appear for new clips, verify: (1) `getThumbnailAsync` is being called for the new URL (e.g. no early return or length mismatch), (2) presigned URL is valid and accessible on the device (e.g. CORS/redirect issues on iOS), (3) no race where `resolvedClipUrls` is reset or out of sync with `edl.timeline`.
   - **Incremental thumbnail updates (suggestion):** Instead of updating `resolvedThumbnailUrls` only after all clips’ thumbnails are generated, consider updating per clip: e.g. maintain an array and set `resolvedThumbnailUrls[i] = uri` as each `getThumbnailAsync` completes. That way the new clip can show its thumbnail as soon as it is ready, without waiting for older clips to be regenerated.
   - **Prioritize new clip (optional):** When the timeline length increases, run thumbnail generation for the **new** clip index first, then backfill the rest, so the newly added clip gets a thumbnail sooner.

4. **Clip block: loading and empty states**
   - **ClipBlock** (in `EdlTimelineTracks.tsx`): Differentiate “thumbnail/playable not yet available” from “no media.”
   - **Option A:** Pass a per-clip “thumbnail loading” flag (e.g. from the screen: “this index is still generating thumbnail”) and show a small spinner or shimmer inside the block until `thumbnailUri ?? playableUrl` is set.
   - **Option B:** When `!thumbnailUri && !playableUrl` and the clip’s `clipUrl` is set (e.g. S3 key), show a “Loading…” or “Preparing…” label (and optionally a spinner) instead of only the clip index. When `thumbnailUri` or `playableUrl` is available, show the image (or video frame) as today.
   - Ensure clip bounds and overflow remain correct: thumbnail image (or placeholder) stays inside the block; use `overflow: 'hidden'` on the clip container so nothing spills over the label or trim handles.

5. **Async flow and states**
   - Model the add-video flow as explicit states, e.g. **idle** → **picking** (picker open) → **importing** (upload in progress) → **resolving** (optional: clip in timeline but URL not yet resolved) → **generating thumbnails** (optional) → **ready**. Expose at least “importing” (and optionally “generating thumbnails”) in the UI so the user always knows why the UI is waiting.
   - Keep backend and EDL shape unchanged: no new API for “import status”; only use existing `addClipLoading` and, if needed, derived state (e.g. “this clip has no thumbnail yet but has clipUrl”) to drive UI.

6. **Smooth UX constraints**
   - No app freeze: keep upload and thumbnail generation off the JS thread where possible; use existing async patterns (effects, promises). Show loading indicators so the user never thinks the app is stuck.
   - No invisible waiting: every “wait” (picker, upload, URL resolve, thumbnail) should have a visible cue (spinner, placeholder block, or “Loading…” text).
   - No empty clip without explanation: if a clip exists in the timeline, either show a thumbnail/playable frame or show an explicit loading/placeholder state until the thumbnail is ready.
   - Avoid sudden jumps: if using a temporary placeholder block, make the transition to the real clip as smooth as possible (e.g. same width or crossfade); avoid layout jumps when the real clip replaces the placeholder.

**Constraints**

- Do **not** change backend logic unless necessary for thumbnail support (e.g. if a new endpoint is required for server-side thumbnails, document it separately).
- Do **not** redesign the whole editor; limit changes to:
  - Loading feedback when adding a video (add-clip flow).
  - Placeholder clip or overlay while processing.
  - Thumbnail generation and rendering for new clips (and optionally incremental/per-clip thumbnail updates).
- Preserve existing behavior: clip trimming, reorder, selection, timeline scroll, and EDL save/render must continue to work.

**Expected result (after implementation)**

- When the user taps “+” and selects a video, a loading indicator appears immediately (e.g. on the add button or as an overlay / label such as “Loading video…” or “Preparing clip…”).
- The timeline shows a temporary loading placeholder (e.g. gray block with “Loading…” and spinner) where the new clip will appear, so the timeline never looks “stuck” or empty during import.
- When processing finishes, the real clip appears in the timeline. As soon as its thumbnail is available, the clip block shows the preview image; until then, the block shows an explicit loading state (spinner or “Preparing…”), not a blank or unexplained empty block.
- No added video remains as a permanently empty block: every imported clip eventually shows at least one thumbnail (or a clear error/fallback state).
- The add-video experience feels responsive and predictable (similar to CapCut / Instagram-style editors).

**Files to touch (when implementing)**

- `mobile/src/screens/EdlEditorScreen.tsx` — Pass `addClipLoading` (or equivalent) to timeline; optionally add “pending clip” or placeholder clip state; ensure thumbnail effect runs for new clips and consider incremental thumbnail updates.
- `mobile/src/components/edl/EdlTimelineTracks.tsx` — Accept loading/placeholder props; render loading placeholder block when adding clip; in `ClipBlock`, accept optional “loading” prop or derive from thumbnail/playable state and show spinner or “Loading…” when appropriate; keep clip container `overflow: 'hidden'` and thumbnail within bounds.
- No backend or API contract changes required for the above; only UI and client-side state.

**Status:** Thumbnail incremental generation and ClipBlock “Preparing…” state implemented; loading popup and placeholder clip not yet implemented.

---

#### 18.10.21 Add new video clip UX (loading popup + floating add button)

**Purpose:** Refactor the “Add new video clip” flow so it feels like a modern mobile editor (Instagram Edits / CapCut / TikTok): a clear loading popup while media is imported/processed, and a floating “+” button on the right side of the video track.

**Goals**

- Show a **loading popup/modal** every time a new video is added (centered, dark card, spinner, “Loading media”, optional Cancel).
- Make the **“+” add button** a proper **floating** control on the right side of the video layer (circular, light background, shadow, always visible, not clipped by timeline).

---

**Investigation (current behavior)**

| Area | Current implementation | Issue |
|------|------------------------|--------|
| **Loading feedback** | `addClipLoading` in `EdlEditorScreen` is set `true` after the user selects a video (after picker returns), then `false` in `finally` after `mediaApi.upload()` and `updateEdl({ timeline })`. | **Never shown in UI.** No modal, no overlay, no spinner. The screen looks idle during upload (and during async thumbnail generation after that). |
| **When loading starts/ends** | Loading starts after `launchImageLibraryAsync` resolves with a chosen asset; it ends in `finally` immediately after the clip is appended to the timeline. | Thumbnail generation runs in a separate effect after EDL update; the user sees no loading during that phase. Popup should stay visible until “fully ready” (at least until clip is in timeline; optionally until new clip’s thumbnail is ready). |
| **Add button placement** | The “+” is a `TouchableOpacity` inside the **video track’s** `trackContent`, which lives inside the **scrollable inner** `View` (same as ruler and all tracks). Position: `left: totalDuration * pixelsPerSecond + 8`. | Button is **in the scroll content**, so it sits at the **end of the timeline** (past the last clip) and **scrolls with the timeline**. It is not pinned to the **visible** right edge of the viewport. |
| **Add button style** | `styles.addClipBtn`: `position: 'absolute'`, `top: 2`, `width: 32`, `height: TRACK_HEIGHT - 8` (~28px), `borderRadius: 16`, `backgroundColor: colors.surfaceElevated`, `borderWidth: 2`, `borderColor: colors.border`, `borderStyle: 'dashed'`, `zIndex: 2`. | Looks like a small dashed box, not a prominent “floating” circle. No shadow/elevation; not explicitly “floating” or “right-edge” in the reference sense. |
| **Scroll behavior** | Timeline is a horizontal `ScrollView`; content width = `widthPx` (duration × pixelsPerSecond). | To get a “floating at visible right edge” button, the button would need to live **outside** the scrollable content (e.g. overlay on the timeline area or in a sibling that stays right-aligned in the viewport). Current design is “at true end of clips.” |

**Relevant code**

- **EdlEditorScreen.tsx:** `handleAddClip` (lines ~554–596): permission → `launchImageLibraryAsync` → on asset selected, `setAddClipLoading(true)` → `mediaApi.upload()` → `updateEdl({ timeline })` → `finally { setAddClipLoading(false) }`. No modal or popup; `addClipLoading` is not passed to any child.
- **EdlTimelineTracks.tsx:** Video track structure: `trackRow` → `trackContent` (relative) → clip blocks (absolute by `left`) + add button (absolute `left: totalDuration * pixelsPerSecond + 8`). `trackContent` is inside the wide `inner` View inside the horizontal `ScrollView`.

---

**Required changes (summary)**

1. **Loading popup/modal** — Show a centered modal when a new video is being added: dark rounded card, dimmed overlay, loading spinner, “Loading media” text, optional “Cancel” (disabled or TODO if cancel not supported). Keep it visible for the whole async flow (import + timeline insertion; optionally until new clip thumbnail is ready). Close automatically when done.
2. **Loading animation** — Spinner (or progress ring / pulse) inside the popup; smooth, visible on dark background, above the text.
3. **Popup visibility** — Do not dismiss too early; only close when the clip is fully in the timeline (and optionally when its thumbnail is ready).
4. **Cancel action** — Include a “Cancel” row in the popup; if abort is not supported yet, leave disabled or document as TODO.
5. **Floating “+” button** — Round, floating on the **right** side of the video track: light/white background, dark plus icon, subtle shadow/elevation, mobile-friendly size. Either (a) pinned to the **visible right edge** of the timeline viewport (button outside scroll content) or (b) keep at true end of clips but restyle as a clear floating action. Spec prefers “floating at visible right side.”
6. **Button independence** — Button should feel like a timeline action, not part of a clip; separate layer, not clipped, not hidden.
7. **Horizontal scroll** — If keeping viewport-pinned: button stays on the visible right. If keeping at end of content: it stays at the end of the track (current behavior, just restyled).
8. **Preserve behavior** — Do not break picker, timeline insertion, thumbnail generation, playback, or trimming.

**Suggested component structure**

- **AddMediaLoadingModal** — `visible`, `statusText` (e.g. `"Loading media"`), `onCancel` (optional). Renders overlay + card + spinner + text + Cancel.
- **TimelineAddButton** — `onPress`, floating/right-aligned. Can wrap the current TouchableOpacity and be used either inside the track (at end) or in an overlay for viewport-right placement.

---

**First task to do (recommended order)**

**Task 1 (do this first): Add the loading popup and wire it to the add-clip flow**

1. **Add `AddMediaLoadingModal`** (new component or inline in `EdlEditorScreen`):
   - Props: `visible: boolean`, `statusText?: string`, `onCancel?: () => void`.
   - UI: dimmed full-screen overlay (e.g. `Modal` with transparent background + dark overlay), centered dark rounded card, **loading spinner** at top, primary text e.g. “Loading media”, optional “Cancel” button (can be disabled with a TODO if cancel is not implemented).
   - Animation: smooth fade/scale in when `visible` becomes true (e.g. `Animated` or simple opacity/scale).

2. **Wire modal to `addClipLoading` in `EdlEditorScreen`:**
   - Render the modal when `addClipLoading === true`.
   - Set `addClipLoading(true)` **as soon as** the user has selected a video (already done: after picker returns, before `mediaApi.upload()`).
   - Set `addClipLoading(false)` in the existing `finally` (when clip is in timeline). Optionally, keep the modal open until the **new** clip’s thumbnail is ready (e.g. derive “adding clip index” and wait until `resolvedThumbnailUrls[thatIndex]` is string or null), then close — for a first version, closing when the clip is in the timeline is acceptable.

3. **Do not dismiss too early:** Ensure the modal stays visible for the entire `handleAddClip` async block (upload + `updateEdl`). If you later add “wait for thumbnail,” keep the modal visible until that condition is met.

4. **Cancel (optional for Task 1):** Add the Cancel button to the modal layout; leave it disabled or no-op with a TODO if abort is not supported.

**Why this first:** It fixes the main UX complaint (no visible feedback during import), is a single, well-scoped change (one modal + one state wire), and does not depend on the add-button refactor. Once the popup is in place, the “+” button styling and placement can be done as a separate task.

**Task 2 (after Task 1): Floating add button**

- Restyle the “+” as a round floating button (light background, dark icon, shadow).
- Decide placement: viewport-right (button outside `ScrollView`, overlay on timeline) vs. end-of-track (current position, restyled). Implement chosen option and, if viewport-right, ensure the button stays aligned with the video track vertically and does not get clipped.

---

**Investigation: Loading popup always shows 0% and user cannot cancel**

**Reported issues**

1. The loading popup always shows **0%**; progress does not update during the upload.
2. The user **cannot cancel** the loading when adding a new video (no way to abort or dismiss).

**Root causes (deep investigation)**

**1. Why progress stays at 0%**

| Cause | Detail |
|-------|--------|
| **XHR upload progress in React Native** | `apiFormDataWithProgress` uses `XMLHttpRequest` and `xhr.upload.onprogress`. In React Native, upload progress for `FormData` with file bodies is **not reliably reported**: progress events may not fire, or they fire with **no progress information** (`e.loaded` / `e.total` are 0 or `e.lengthComputable` is false). This is a known RN limitation (e.g. [react-native#12911](https://github.com/facebook/react-native/issues/12911)). So `onProgress` is often never called with a value &gt; 0 during the upload. |
| **totalBytes often undefined** | Progress is computed as `(e.loaded / totalBytes) * 100` when `totalBytes` is provided, or from `e.loaded`/`e.total` when `e.lengthComputable`. We get `totalBytes` via `FileSystem.getInfoAsync(asset.uri, { size: true })`. On **iOS**, `asset.uri` from `expo-image-picker` is often a **non-file URI** (e.g. `ph://` or `assets-library://`). `expo-file-system`’s `getInfoAsync` does not support those schemes, so the call fails or returns no `size`, and `totalBytes` stays `undefined`. So we fall back to XHR’s `e.total`, which is usually 0 for multipart uploads in RN. |
| **Result** | Both branches of the progress logic yield `percent = 0` until the request completes. The only call to `onProgress(100)` happens in the `load` handler; the modal then closes immediately in `finally`, so the user never sees 100%. The UI therefore shows **0% for the entire upload**. |
| **Unused asset.fileSize** | `expo-image-picker` can return `asset.fileSize` (in bytes) on the result object. The current code **does not use** `asset.fileSize`; it only tries `FileSystem.getInfoAsync(asset.uri)`. Using `asset.fileSize` when present would at least give a valid `totalBytes` so that **if** XHR ever reports `e.loaded`, percent could be computed. On platforms/versions where upload progress still doesn’t fire, percent would still stay 0. |

**2. Why the user cannot cancel**

| Cause | Detail |
|-------|--------|
| **No onCancel passed** | `AddMediaLoadingModal` is rendered with `visible={addClipLoading}`, `statusText`, and `progress={addClipProgress}`. **`onCancel` is not passed.** The modal’s Cancel button is `disabled={!onCancel}` and styled as disabled when `onCancel` is missing, so the button is **not tappable**. |
| **No abort path** | Even if `onCancel` were passed, there is **no way to abort the in-flight upload**. `mediaApi.uploadWithProgress` returns a Promise and does not expose `XMLHttpRequest` or an `abort()` method. So the screen cannot cancel the request when the user taps Cancel. |
| **Guard blocks second add** | `handleAddClip` starts with `if (!edl || addClipLoading) return;`. While the first upload is in progress, `addClipLoading` is true, so the user **cannot start adding another video** (e.g. to “replace” the current action). The only way to get out of the loading state is for the upload to finish or fail. |

**Suggested fixes (do not implement in this pass)**

- **Progress**
  - Use **`asset.fileSize`** from the image-picker result when available and pass it as `totalBytes` so that any XHR progress that does report `e.loaded` can be shown as a percentage.
  - Add a **fallback / simulated progress** when real progress is unavailable: e.g. drive progress from a timer (0% → 85% over a few seconds or based on elapsed time), then set 100% when the upload Promise resolves. That way the user always sees movement instead of a stuck 0%.
  - Optionally: **indeterminate mode** when progress cannot be computed (no totalBytes and no XHR progress): show the spinner and “Loading media” without a percentage bar, or show a bar with an indeterminate animation.
- **Cancel**
  - **Pass `onCancel`** from `EdlEditorScreen` to `AddMediaLoadingModal` so the Cancel button is enabled.
  - **Make the upload abortable:** e.g. have `apiFormDataWithProgress` return an object `{ promise, abort }` (or accept an `AbortSignal` and call `xhr.abort()` when signalled). In `handleAddClip`, keep a ref to the current `abort` function; when the user taps Cancel, call `abort()`, then in the catch block treat “Request aborted” as a user cancel (no “Add clip failed” alert), and in `finally` clear `addClipLoading` and `addClipProgress`.
  - Ensure that after cancel, the user can tap “+” again to add a different video (no stale loading state).

**Files involved**

- `mobile/src/lib/api.ts` — `apiFormDataWithProgress`: progress logic; add abort return or signal.
- `mobile/src/lib/api/endpoints.ts` — `mediaApi.uploadWithProgress`: pass through abort; optionally use `asset.fileSize` at call site or document that caller should pass totalBytes from asset when available.
- `mobile/src/screens/EdlEditorScreen.tsx` — get `totalBytes` from `asset.fileSize` when present; pass `onCancel` to modal; wire cancel to abort and state reset.
- `mobile/src/components/edl/AddMediaLoadingModal.tsx` — no change required for cancel (already supports `onCancel`); optional indeterminate state when progress is undefined.

---

**Investigation: Loading percentage reaches 85% then stops**

**Reported behaviour:** The loading bar reaches 85% and does not advance to 100%.

**Root cause:** In `handleAddClip`, when the upload succeeds we do:

1. In the **try** block: clear the simulated interval, then `setAddClipProgress(100)`, then run the rest of the success logic (EDL update, etc.).
2. In **finally**: we call `clearAddClipState()`, which does `setAddClipProgress(undefined)` and `setAddClipLoading(false)`.

Both run in the same synchronous turn after `await promise` resolves. So we schedule a state update to 100%, then immediately schedule updates to `undefined` and `false`. React may **batch** these updates; the last write wins, so the visible state can be `undefined` and the modal closes. The 100% update may never be committed or may be overwritten before the next paint. So the user never sees 100% — they see 85% (the cap of the simulated progress) and then the modal disappears, which feels like “it stops at 85%”.

**Suggested fix (do not implement here):** Either (1) **defer clearing state** so 100% is visible briefly: e.g. after `setAddClipProgress(100)`, call `setTimeout(() => clearAddClipState(), 150)` (or `requestAnimationFrame` twice) so the modal shows 100% then closes; or (2) **do not set progress to undefined on success**: in `clearAddClipState` only clear the interval and abort ref, and set loading to false; set progress to undefined only on cancel or error, so on success the modal closes with the bar still at 100%. Option (1) is simpler and keeps a single place that clears state.

**Status: Undone.** Tracked here; implement when prioritised (defer clear state or avoid clearing progress on success).

---

**Constraints**

- Do not break: media picker, timeline insertion, thumbnail generation, playback, clip trimming.
- Only improve: loading UX, popup behavior, add-button placement and styling.

**Files to touch (when implementing)**

- **Task 1:** `mobile/src/screens/EdlEditorScreen.tsx` (render modal when `addClipLoading`; optionally extend “ready” to thumbnail). New file optional: `mobile/src/components/edl/AddMediaLoadingModal.tsx`.
- **Task 2:** `mobile/src/components/edl/EdlTimelineTracks.tsx` (add-button styles and/or structure for floating/viewport-right); optionally `TimelineAddButton.tsx` if extracted.

**Expected result**

- Every time the user adds a video, a polished loading popup appears (spinner + “Loading media”), and it closes when the clip is ready (and optionally when its thumbnail is ready).
- The “+” button floats on the right side of the video layer and looks like a proper add-media action.

**Status:** Planning only; not implemented.

---

#### 18.10.22 Adjust panel refactor (reference design)

**Purpose:** Replace the current basic Adjust modal with a professional, reference-style bottom sheet: drag handle, “Apply to all clips” row, category tabs, slider-based controls, scrollable list, confirm action, and dark editor styling. No backend or editor-wide redesign—only the Adjust UI.

**Status:** Implemented. Adjust sheet uses @gorhom/bottom-sheet, drag handle, Apply-all row, tabs, sliders (@react-native-community/slider), confirm; Saturation/Contrast/Vibrance wired to edl.color.

---

##### Investigation: current Adjust implementation

| Area | Finding |
|------|--------|
| **Component** | `mobile/src/components/edl/AdjustSheet.tsx` — single file, ~125 lines. |
| **Presentation** | Uses React Native `Modal` with `transparent` and `animationType="slide"`. Overlay (Pressable) + inner sheet (Pressable, `maxHeight: '70%'`), not `@gorhom/bottom-sheet`. |
| **Header** | Title “Adjust” (text) + close button (X icon) only. No drag handle, no confirm/check. |
| **Body** | Single `ScrollView` with three **TextInput** fields: Saturation (0.8–1.3), Contrast (0.9–1.2), Vibrance (0.8–1.3). Each has label + boxed numeric input. Bottom: single **Reset** button (outlined). No tabs, no “apply to all clips” row. |
| **Data** | Reads/writes `edl.color` via `onEdlChange`. `EdlColor` in `mobile/src/lib/edlLib.ts`: `saturation`, `contrast`, `vibrance`, `startSec`, `endSec`. Default `{ saturation: 1, contrast: 1, vibrance: 1 }`. Clamping in AdjustSheet: 0.5–2 for all three. |
| **Integration** | `EdlEditorScreen`: `activeTool` state includes `'adjust'`. Toolbar “Adjust” (SlidersHorizontal icon) sets `activeTool === 'adjust'`. `<AdjustSheet visible={activeTool === 'adjust'} onClose={() => setActiveTool(null)} edl={edl} onEdlChange={updateEdl} />`. Color trim (timeline range) is separate: `setColorTrim` / `onColorTrim` for startSec/endSec. |
| **Dependencies** | `@gorhom/bottom-sheet` is in `package.json` (^5.2.8) but **not used** anywhere in the app yet. No slider component in use; would need to add or use a suitable RN slider. |
| **Other sheets** | `TrimSheet`, `SlipSheet`, `AudioSheet`, `CaptionsSheet` all use the same pattern: Modal + overlay + sheet with title + X close. None use BottomSheet. |

**Gap vs reference:** No drag handle, no “Apply adjustments to all clips” row, no tabs, no sliders (only text inputs), no top-right confirm/check, no reference-style dark editor look, and no explicit “preview stays visible above” behavior (current modal already leaves preview visible behind overlay).

---

##### Required UI changes (reference design)

1. **Replace current Adjust modal**
   - Remove: simple title, close-only header, text input fields, Reset button.
   - Replace with: full reference-style bottom sheet (structure below).

2. **Bottom sheet structure**
   - Large rounded bottom sheet; preview remains visible above.
   - **Top:** drag handle.
   - **Then:** “Apply adjustments to all clips” row (toggle/radio left, label, confirm/check right).
   - **Then:** tabbed category navigation (Adjust | White balance | HSL | Style).
   - **Then:** scrollable list of adjustment controls.
   - **Top-right:** confirm/check action.
   - Styling: dark theme, rounded top corners, sufficient height; smooth slide-up. Prefer **@gorhom/bottom-sheet** (already in project, currently unused).

3. **“Apply adjustments to all clips”**
   - One row: [toggle/radio] + label “Apply adjustments to all clips” + [check icon] on the right.
   - Behavior: toggle state; check button applies/saves and closes sheet (or same as top-right confirm).

4. **Category tabs**
   - Tabs: **Adjust** | White balance | HSL | Style.
   - Horizontal row; active tab highlighted; inactive lower contrast.
   - Switching tab changes visible controls. Only **Adjust** tab needs full implementation first; others can be scaffolded (tabs visible, content placeholder or empty).

5. **Sliders instead of text inputs**
   - Remove all numeric TextInputs.
   - Each control row: **label (left)** | **slider (middle)** | **numeric value (right)**.
   - **Adjust** tab controls (reference): Exposure, Clarity, Highlights, Shadows, Contrast, Brightness, Saturation, Vibrance.
   - Styling: dark track, white thumb, value right-aligned; live updates while dragging.
   - **Data:** Current EDL/backend only expose `saturation`, `contrast`, `vibrance`. Implement sliders for these first; others (Exposure, Clarity, Highlights, Shadows, Brightness) can be scaffolded with local state and optional future EDL fields if backend later supports them.

6. **Scrolling**
   - Control list inside the sheet must be vertically scrollable; sheet body scrolls, not the whole screen.

7. **Preview visibility**
   - Sheet overlays lower part of screen; preview stays visible above. Do not replace the whole editor page.

8. **Styling**
   - Dark navy/black background, subtle separators, high-contrast white text, small clear tab labels, minimal modern UI. No boxed inputs, no large Reset button.

9. **Interaction**
   - Slider change → update value live, update numeric indicator, keep state in memory (no typing).
   - Confirm/check → save/apply and close sheet.
   - Close/cancel → keep current app behavior (e.g. preserve or revert) with polished UI.

10. **Technical**
   - React Native. Prefer: **@gorhom/bottom-sheet**, a suitable slider component, **ScrollView** for control list, reusable **AdjustmentRow** (label, value, min, max, onChange).
   - Suggested structure:
     - **AdjustBottomSheet**
       - HeaderHandle
       - ApplyAllRow
       - TabBar (Adjust | White balance | HSL | Style)
       - ControlList (ScrollView)
         - AdjustmentRow (label, value, min, max, onChange) × N
       - ConfirmAction (top-right or inline)

11. **Constraints**
   - Do **not** change backend logic.
   - Do **not** redesign the whole editor.
   - Only refactor the Adjust UI to match the reference.

---

##### Implementation notes (when implementing)

- **Files:** Replace/refactor `mobile/src/components/edl/AdjustSheet.tsx`; optionally split into `AdjustBottomSheet.tsx` + subcomponents (HeaderHandle, ApplyAllRow, TabBar, AdjustmentRow). EdlEditorScreen: keep `visible={activeTool === 'adjust'}` and `onClose`; only the sheet implementation changes.
- **Slider:** Add a dependency if needed (e.g. `@react-native-community/slider`) or use a minimal custom slider; ensure it works with Reanimated if used inside @gorhom/bottom-sheet.
- **Apply to all clips:** If “apply to all clips” means “apply current color adjustments to the whole timeline,” it can map to existing `edl.color` range (startSec/endSec) or a single global range; document chosen behavior in code.
- **EDL color fields:** Keep `saturation`, `contrast`, `vibrance` as the only persisted fields until backend supports more; extra sliders can be UI-only or stored in `edl.color` as optional keys if the backend persists EDL JSON as-is.

---

##### Expected result

- Opening Adjust shows a professional bottom sheet matching the reference (drag handle, apply-all row, tabs, sliders, confirm).
- Numeric text inputs and large Reset button are gone.
- Tabs exist; Adjust tab fully functional with at least Saturation, Contrast, Vibrance as sliders; other controls scaffolded or added as agreed.
- Sheet feels like a modern mobile editing app (Instagram Edits / CapCut style).

##### Implementation summary (done)

- **AdjustSheet.tsx** refactored to use `@gorhom/bottom-sheet` with `snapPoints={['65%']}`, `enablePanDownToClose`, backdrop (tap to close).
- **Header:** Drag handle (BottomSheetHandle), then row: "Apply adjustments to all clips" toggle + confirm (Check) button.
- **Tabs:** Adjust | White balance | HSL | Style; Adjust tab shows scrollable control list; other tabs show "coming soon" placeholder.
- **Controls:** `AdjustmentRow` (label | slider | value); Saturation, Contrast, Vibrance wired to `edl.color`; Exposure, Clarity, Highlights, Shadows, Brightness scaffolded (no-op onChange).
- **Slider:** `@react-native-community/slider`; dark track, white thumb; live value update.
- **No backend or EdlEditorScreen API changes.**

---

##### 18.10.22.1 Adjust bottom sheet — layout fix (header overlap)

**Purpose:** Fix layout so the Adjust sheet header no longer has overlapping elements. Match reference: four clearly separated sections (drag handle, apply row, tabs row, scrollable sliders), with no text or buttons colliding.

**Status:** Implemented. Column wrapper, apply row with radio + flexShrink, tabs on own row, spacing 14px, safe area padding.

---

###### Investigation: why elements overlap

| Area | Finding |
|------|--------|
| **Current structure** | `AdjustSheet.tsx`: BottomSheet has three direct children — (1) `BottomSheetView` with `headerRow` containing only `applyAllRow` (toggle text + confirm button), (2) plain `View` with `tabBar` (four tabs), (3) `BottomSheetScrollView` or `BottomSheetView` for content. So apply row and tabs are already in separate views. |
| **Likely cause of overlap** | No single column wrapper: the sheet body’s direct children may not be laid out as a strict vertical stack. Without a wrapper with `flex: 1`, `flexDirection: 'column'`, and `flexShrink: 0` on header blocks, the library’s content container can compress or layout children in a way that lets the apply row and tab bar share or overlap the same horizontal line. |
| **Apply row** | `applyAllRow` uses `justifyContent: 'space-between'`. Left side is a single `TouchableOpacity` with the full string "Apply adjustments to all clips" and no `flexShrink: 1`. On narrow screens the label can push into the check button or force overflow. No explicit radio/circle indicator; reference shows `[ ○ ]` + label on the left. |
| **Tabs** | `tabBar` is a sibling of the first `BottomSheetView`. It has `paddingHorizontal: 8`, `gap: 4`. If the parent does not reserve a dedicated row for it (e.g. no wrapper with column layout and spacing), it can render on the same line as the apply row or get squeezed. |
| **Spacing** | `headerRow` has `paddingBottom: 12`; `tabBar` has `paddingVertical: 8` but no `marginTop`. There is no explicit margin between “sections” (handle → apply row → tabs row → scroll). Reference requires marginBottom ~12–16 between sections. |
| **Reference layout** | (1) Drag handle — centered, margin above/below. (2) Apply row — left: radio + "Apply adjustments to all clips", right: check; `space-between`; horizontal padding. (3) Tabs row — **own row** below apply row; "Adjust | White balance | HSL | Style"; active tab with underline; margin top from apply row. (4) Scrollable sliders — below tabs with padding. |

---

###### Required layout structure (no overlap)

1. **Section 1 — Drag handle**  
   Centered handle at top with margin above/below (already provided by BottomSheet; ensure handle style doesn’t remove vertical spacing).

2. **Section 2 — Apply adjustments row**  
   - One row: `[ ○ ] Apply adjustments to all clips` on the left, `✓` (confirm) on the right.  
   - `flexDirection: 'row'`, `justifyContent: 'space-between'`, `alignItems: 'center'`.  
   - Left: radio/toggle + label in a row; **left block must have `flexShrink: 1`** (and optionally `flex: 1` with a max width) so the text never overlaps the check.  
   - Right: confirm button, no shrink.  
   - Horizontal padding; **marginBottom: 12–16** so it does not touch the tabs row.

3. **Section 3 — Tabs row**  
   - **Dedicated row** below the apply row.  
   - `flexDirection: 'row'`, spacing between tabs (`gap` or margin), **marginTop** from apply row and **marginBottom: 12–16** from the controls list.  
   - Active tab: highlighted (e.g. underline or background).  
   - Horizontal padding aligned with apply row.  
   - **Must not share the same horizontal line as the apply row.**

4. **Section 4 — Scrollable controls**  
   - Below tabs; inside `BottomSheetScrollView`.  
   - **paddingBottom: 24** (and safe area if needed).  
   - Each row: label (left), slider (center), value (right); vertical spacing between rows.

**Spacing rules:**  
- Between handle and apply row: marginBottom 12–16.  
- Between apply row and tabs row: marginBottom 12–16 (apply row) and/or marginTop (tabs row).  
- Between tabs row and controls: marginBottom 12–16 (tabs row).  
- Controls list: paddingBottom 24 (+ safe area for small screens).

**Safe area:** Use bottom inset (e.g. `useSafeAreaInsets()`) so the sheet content does not clip on devices with home indicator; ensure text doesn’t clip on small screens.

**Constraints:** Do not change editor or sheet functionality; only fix layout so elements never overlap and rows are clearly separated.

---

###### First task to implement

**Task: Restructure Adjust sheet into four explicit sections with a column wrapper and spacing.**

1. Wrap all sheet content (apply row, tabs row, scroll) in a **single wrapper View** with `style={{ flex: 1, flexDirection: 'column' }}` so the body has one column and children stack vertically.  
2. **Apply row (Section 2):**  
   - Left: add a radio/circle indicator + "Apply adjustments to all clips" in a row; give this left block `flexShrink: 1` (and optionally `flex: 1`) so the label can shrink before overlapping the check.  
   - Right: confirm check button (no shrink).  
   - Use `justifyContent: 'space-between'`, horizontal padding, and **marginBottom: 12–16**.  
3. **Tabs row (Section 3):**  
   - Keep tabs in their own `View` with `flexDirection: 'row'`, `marginTop` (or rely on apply row’s marginBottom), **marginBottom: 12–16**, horizontal padding and gap; ensure this view does not sit inside the apply row.  
4. **Scroll (Section 4):**  
   - Keep `BottomSheetScrollView`; set **paddingBottom: 24** (and add bottom safe area inset if needed).  
5. Optionally add bottom safe area padding so the sheet respects the device safe area.

**File to change:** `mobile/src/components/edl/AdjustSheet.tsx` only.  
**Expected result:** Handle → Apply row (one line, no overlap) → Tabs row (separate line) → Scrollable sliders. No overlapping text or buttons; clean spacing; matches reference.

---

##### 18.10.22.2 Adjust sheet — horizontal tabs and visible sliders (current wrong result)

**Purpose:** Fix the Adjust sheet so (1) category tabs render in **one horizontal row** (not a vertical list), (2) slider controls are **visible** below the tabs, (3) top structure matches reference: handle → apply row (radio + label | check) → horizontal tab bar → scrollable sliders. The sheet must feel like a professional mobile editor (Instagram Edits / CapCut style), not a vertical menu or settings page.

**Status:** Implemented. JSX aligned with StyleSheet: sheetContent wrapper, applySection/applyLeft/radio, tabSection for horizontal tabs, scroll with safe-area padding.

---

###### Investigation: why tabs are vertical and sliders missing

| Area | Finding |
|------|--------|
| **Style name mismatch** | In `AdjustSheet.tsx`, the **JSX** references `styles.headerRow`, `styles.tabBar`, `styles.toggle`, `styles.toggleOn`. The **StyleSheet** no longer defines those names: it defines `sheetContent`, `applySection`, `applyLeft`, `radio`, `radioChecked`, `tabSection` instead. So `styles.tabBar` and `styles.headerRow` are **undefined** at runtime. |
| **Why tabs stack vertically** | The tabs container is `<View style={styles.tabBar}>`. With `style={undefined}`, the View gets React Native’s default layout: **flexDirection defaults to 'column'**. So the four tab buttons are laid out in a column and appear as a vertical list ("Adjust", "White balance", "HSL", "Style" one under the other). The intended style `tabSection` has `flexDirection: 'row'` but is never applied because the JSX uses `tabBar`. |
| **Why sliders appear missing** | The sheet body has **no single column wrapper**. The BottomSheet’s direct children are: (1) BottomSheetView (apply row), (2) View (tabs), (3) conditional BottomSheetScrollView (sliders). Without a wrapper View with `flex: 1` and `flexDirection: 'column'`, the scroll view may not receive a bounded height (flex: 1 has nothing to fill). The scroll content can be off-screen or the scroll area height can be zero, so the slider list is not visible. |
| **Apply row** | JSX still uses the old structure (single TouchableOpacity with text + confirm button) and `styles.toggle` / `styles.toggleOn`, which are undefined. The StyleSheet has the reference layout (applyLeft, radio, radioChecked) but the JSX was never updated to use the wrapper, applySection, or radio. So the apply row also lacks the intended radio + label left, check right layout. |
| **Summary** | A partial refactor left the StyleSheet updated but the JSX still using old style names and structure. Fix: align JSX with the intended layout (single column wrapper, apply row with radio, **tabs container with flexDirection: 'row'**, scroll view with flex: 1) and ensure every style used in JSX exists in the StyleSheet (e.g. use `tabSection` for the tabs container, or define `tabBar` with `flexDirection: 'row'`). |

---

###### Required behavior (no vertical tab menu)

1. **Tabs MUST be horizontal**  
   - One row: `Adjust   White balance   HSL   Style`.  
   - Use a container with `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'flex-start'`, and gap or margin between tabs.  
   - **Do not** render tabs in a column or as a vertical list.

2. **Active tab**  
   - Selected tab (e.g. "Adjust") must be visually distinct: brighter text, and optionally underline or pill background.

3. **Apply row**  
   - Separate row below handle: left = radio/circle + "Apply adjustments to all clips", right = confirm check; `justifyContent: 'space-between'`.

4. **Slider controls**  
   - Below the tab bar, a **scrollable** list of rows: label (left) | slider (center) | numeric value (right).  
   - Rows: Exposure, Clarity, Highlights, Shadows, Contrast, Brightness, Saturation, Vibrance.  
   - This area must be inside `BottomSheetScrollView` and given space (e.g. wrapper with `flex: 1` so the scroll view can take remaining height).

5. **Structure**  
   - Handle → Apply row → **Horizontal** tabs row → Controls scroll view.  
   - No vertical stacking of category labels.

---

###### Next task to implement

**Task: Fix Adjust sheet so tabs are horizontal and sliders are visible.**

1. **Single column wrapper**  
   Wrap all sheet content (apply row, tabs row, scroll) in one `View` with `style={styles.sheetContent}` so the body has `flex: 1`, `flexDirection: 'column'`. This gives the scroll view a flex parent and allows it to take remaining height.

2. **Apply row**  
   Use the structure that matches the StyleSheet: `applySection` → `applyAllRow` → left: TouchableOpacity with `applyLeft` (radio + label), right: confirm button. Ensure JSX uses `styles.applySection`, `styles.applyLeft`, `styles.radio`, `styles.radioChecked` (and remove use of `headerRow`, `toggle`, `toggleOn` if they are no longer in the StyleSheet).

3. **Tabs row — horizontal**  
   Use the tabs container style that has **flexDirection: 'row'**: either change JSX from `styles.tabBar` to `styles.tabSection`, or add to StyleSheet a `tabBar` style with `flexDirection: 'row'`, `alignItems: 'center'`, `gap` or margin, and `marginBottom: 14`. Ensure the tabs are never inside a column-only container.

4. **Scroll view**  
   Keep `BottomSheetScrollView` with `style={styles.scroll}` (flex: 1). Ensure it is a child of the column wrapper so it receives remaining height. Use `contentContainerStyle` with `paddingBottom: 24 + insets.bottom` so sliders are visible and not clipped.

5. **Verify**  
   - Tabs render in one horizontal row.  
   - Slider list (Exposure through Vibrance) is visible and scrollable below the tabs.  
   - Apply row shows radio + label on the left, check on the right.  
   - No vertical list of categories; overall look matches a professional editor sheet.

**File to change:** `mobile/src/components/edl/AdjustSheet.tsx` only.  
**Expected result:** Horizontal tab bar; slider controls visible and scrollable; handle → apply row → tabs row → sliders; no vertical category menu.

---

##### 18.10.22.3 Adjust sheet — confirm (check) button does not close the sheet

**Purpose:** Understand why the blue check button that should confirm changes and close the Adjust popup does not work (no save, no close).

**Status:** Investigation only; no implementation.

---

###### Investigation: why the confirm button does not work

| Area | Finding |
|------|--------|
| **Intended behavior** | Tapping the check button should call `onClose()`, which in the parent (`EdlEditorScreen`) is `() => setActiveTool(null)`. That sets `visible={activeTool === 'adjust'}` to false, so the sheet receives `index={-1}` and closes. Slider changes are already applied live via `onEdlChange` when the user drags; "confirm" in the current design only means "close the sheet." So the bug is that the button press is not firing or not closing. |
| **Parent wiring** | `EdlEditorScreen` passes `onClose={() => setActiveTool(null)}` to `AdjustSheet`. The callback is correct; when it runs, the sheet should close. |
| **Confirm handler** | `handleConfirm` is `useCallback(() => { onClose(); }, [onClose])`, and the check button uses `onPress={handleConfirm}`. The logic is correct. |
| **Touchables inside @gorhom/bottom-sheet** | The sheet uses **React Native’s** `TouchableOpacity` (import from `'react-native'`). The library’s content is wrapped with gesture handlers (`TapGestureHandler`, `PanGestureHandler`). On Android (and in some cases on iOS), the **default RN touchables do not receive touches** because the bottom sheet’s gesture handlers capture the events first. This is a known issue (e.g. gorhom/react-native-bottom-sheet#58, #285). |
| **Recommended fix (do not implement here)** | Use touchables **from `@gorhom/bottom-sheet`** (or from `react-native-gesture-handler`) for any pressable inside the sheet. The library re-exports `TouchableOpacity`, `TouchableHighlight`, `TouchableWithoutFeedback` so they cooperate with the sheet’s gesture system. In `AdjustSheet.tsx`, change the import from `import { TouchableOpacity } from 'react-native'` to using the touchables exported by `@gorhom/bottom-sheet` for the confirm button, the apply-row toggle, and the tab buttons. Then the confirm button (and other buttons) should receive presses and the sheet should close when confirm is tapped. |
| **Saving** | No extra "save" step is required for the EDL: slider moves already call `onEdlChange({ color: { ... } })`, so the draft is updated live. Closing the sheet is sufficient; the parent’s `edl` state already holds the latest values. |

---

##### 18.10.22.4 Adjust: parameters not visible on video + confirm button still not applying/closing

**Purpose:** Investigate (1) why adjust parameters (saturation, contrast, vibrance) do not show on the video in the mobile editor, and (2) why the blue confirm button may still not apply changes and close the Adjust sheet.

**Status:** Investigation only; no implementation.

---

###### Investigation 1: Why adjust parameters do not show on the video

| Area | Finding |
|------|--------|
| **Preview pipeline** | The in-editor video preview is `EdlDraftPlayer`, which receives only `playUrl`, `playing`, `onPlayingChange`, `onTimeUpdate`, `onDurationChange`, `seekToRef`. It does **not** receive `edl` or `edl.color`. The component plays the URL with `expo-video` (useVideoPlayer / VideoView) with no client-side filters. |
| **What playUrl is** | `playUrl` in `EdlEditorScreen` is set from: (a) the first timeline clip's resolved storage URL, or (b) after "Render draft", the backend's `draftVideoUrl`. So the preview is always the **raw clip** or the **last rendered draft** — never a live-applied color grading. |
| **Where color is used** | `edl.color` is stored in local state when the user moves sliders (`onEdlChange({ color: next })`). It is sent to the backend only when the user taps **Save** (`projectsApi.updateEdl(projectId, edl)`) or when they **Export/Render** (updateEdl then renderDraft). The backend uses `edl.color` in `backend/src/video/render.ts` (`buildColorFilter`, applied as FFmpeg video filter) only at **render time**. So color adjustments are applied only in the **output** video, not in the editor preview. |
| **Conclusion** | By design, the mobile app has **no live preview of color adjustments**. The user can change sliders and the EDL state updates, but the preview video is unchanged until they Save and then Render draft (or Export). To show adjust parameters on the video during editing would require either (a) client-side video processing (e.g. WebGL/GPU filters, or a native filter pipeline) applying saturation/contrast/vibrance to the current frame, or (b) a backend "preview render" that returns a short clip with color applied — neither exists today. |

---

###### Investigation 2: Why the confirm button may not apply changes and close the sheet

| Area | Finding |
|------|--------|
| **"Apply" semantics** | In the current implementation, "apply" is **close only**. Slider changes are written to `edl` in real time via `onEdlChange` (AdjustSheet's `setColor`). There is no separate "apply" commit step; the confirm button is intended to call `onClose()` so the sheet dismisses. So "does not apply the changes" can mean either (a) the user expects a separate persist step (there isn't one; Save is separate), or (b) the button does not close the sheet. |
| **Confirm handler** | `handleConfirm` calls `onClose()`. The parent passes `onClose={() => setActiveTool(null)}`, so `visible={activeTool === 'adjust'}` becomes false and the sheet receives `index={-1}`. The logic is correct. |
| **TouchableOpacity source** | AdjustSheet already imports `TouchableOpacity` from `@gorhom/bottom-sheet` so that touches work with the sheet's gesture handlers. If the button still does not fire, possible causes below. |
| **Controlled index** | The sheet uses controlled `index={sheetIndex}` with `sheetIndex = visible ? 0 : -1`. When the parent sets `activeTool` to null, a re-render should pass `index={-1}` and the sheet should close. Some versions of @gorhom/bottom-sheet may not animate closed when moving from 0 to -1 purely via prop; they may expect an imperative close (e.g. ref.current.snapToIndex(-1) or ref.current.close()) before or in addition to the parent clearing visibility. |
| **Gesture conflict** | Even with the library's TouchableOpacity, scroll or pan gestures inside the sheet can sometimes capture the touch before it reaches the button (e.g. after scrolling the control list on Android). Wrapping the confirm button (or the whole header row) in `NativeViewGestureHandler` (react-native-gesture-handler) with `disallowInterruption={true}` can reserve the touch for the button. |
| **Recommendations (do not implement here)** | (1) Ensure the confirm button closes the sheet: if closing via `index={-1}` alone is unreliable, add a ref to the BottomSheet and in `handleConfirm` call `bottomSheetRef.current?.close()` or `snapToIndex(-1)` and then call `onClose()` so the parent clears `activeTool`. (2) If touches still don't reach the button, wrap the apply row (or at least the confirm button) in `NativeViewGestureHandler`. (3) Optionally, on confirm, call an explicit "persist" (e.g. trigger Save) so the user perceives "apply" as saving — but that would be a product decision. |

---

*End of PLANNING-MOBILE.md*
