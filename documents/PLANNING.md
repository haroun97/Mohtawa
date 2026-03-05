# Project Planning Document

## Mohtawa — AI Content Automation Workflow Platform

**Date:** February 20, 2026
**Methodology:** Iterative (phase-based MVP approach)
**Last updated:** March 2026 — **Done (recent):** Phase 7b.7 review-queue + Frontend Review Queue UI + per-row actions (approve/skip/regenerate/edit, queue thumbnails, failed-item error + Regenerate); Auto Edit state persistence (Option A): node card and Logs panel derive display from `iterationSteps` (last successful iteration) so draft state and logs match after reload; EDL editor save-on-close when dirty + Save draft (Ctrl+S and Save button in top bar, `handleSaveDraft` / `handleClose` in EdlEditor); Adjust panel Reset button text set to dark for readability. **Next:** Phase 7a — Desktop: optional right panel for tools (show active tool controls in a right-side panel on desktop), or Phase 7a — Delete selected clip (if backend supports), or Phase 7c — Ideas & Scripts Editor.

---

## Table of Contents

1. [Project Phases Overview](#1-project-phases-overview)
2. [Phase 1 — Foundation](#2-phase-1--foundation)
3. [Phase 2 — Workflow Builder](#3-phase-2--workflow-builder)
4. [Phase 3 — Workflow Persistence & Execution](#4-phase-3--workflow-persistence--execution)
5. [Phase 4 — AI & External Integrations](#5-phase-4--ai--external-integrations)
6. [Phase 5 — Polish & Deploy MVP](#6-phase-5--polish--deploy-mvp)
7. [Post-MVP Phases](#7-post-mvp-phases) (includes Phase 6b — Voice cloning; Phase 7 — Video edit pipeline; Phase 7a — EDL Editor; Phase 7b — Ideas List + Loop; Phase 7c — Ideas & Scripts Editor)
8. [Data Model](#8-data-model)
9. [API Routes](#9-api-routes)
10. [Risk Register](#10-risk-register)
11. [Mobile Responsiveness](#11-mobile-responsiveness)

---

## 1. Project Phases Overview

```
Phase 1          Phase 2           Phase 3            Phase 4          Phase 5
Foundation       Workflow Builder   Persistence &      AI & External    Polish &
                                    Execution          Integrations     Deploy MVP
┌──────────┐    ┌──────────────┐   ┌──────────────┐   ┌────────────┐  ┌──────────┐
│ Backend   │    │ Node library │   │ Prisma       │   │ LLM nodes  │  │ Error    │
│ scaffold  │───▶│ Drag & drop  │──▶│ schema       │──▶│ TTS nodes  │─▶│ handling │
│ Auth      │    │ Canvas       │   │ Save/load    │   │ Social     │  │ Deploy   │
│ DB setup  │    │ Inspector    │   │ Run engine   │   │ publish    │  │ Vercel   │
└──────────┘    └──────────────┘   └──────────────┘   └────────────┘  └──────────┘
   ~1 week         ~1.5 weeks         ~1.5 weeks         ~1 week        ~1 week
```

**Total estimated MVP timeline: ~6 weeks**

---

## 2. Phase 1 — Foundation ✅

**Goal:** Backend scaffold with auth, database, and project structure ready for development.

### Backend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 1.1| Set up Express app with Vercel serverless adapter | High | ✅ Done   |
| 1.2| Install and configure Prisma (SQLite dev / PostgreSQL prod) | High | ✅ Done |
| 1.3| Define initial Prisma schema (User, Workflow)    | High   | ✅ Done   |
| 1.4| Implement user registration endpoint (`POST /api/auth/register`) | High | ✅ Done |
| 1.5| Implement user login endpoint (`POST /api/auth/login`) | High | ✅ Done |
| 1.6| Create JWT middleware for protected routes      | High     | ✅ Done   |
| 1.7| Create auth validation with Zod schemas         | Medium   | ✅ Done   |
| 1.8| Add error handling middleware                    | Medium   | ✅ Done   |
| 1.9| Set up `.env.example` files for both projects   | Medium   | ✅ Done   |
| 1.10| Add health check endpoint (`GET /api/health`)  | Low      | ✅ Done   |

### Frontend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 1.11| Set up API client (fetch wrapper)             | High     | ✅ Done   |
| 1.12| Create login page                             | High     | ✅ Done   |
| 1.13| Create registration page                      | High     | ✅ Done   |
| 1.14| Implement auth context/store (Zustand)        | High     | ✅ Done   |
| 1.15| Add protected route wrapper                   | High     | ✅ Done   |
| 1.16| Connect dashboard to backend API              | Medium   | ✅ Done   |
| 1.17| Set up React Query provider and hooks          | Medium   | ✅ Done   |

### Infrastructure Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 1.18| SQLite for dev (Neon PostgreSQL for production) | High   | ✅ Done   |
| 1.19| Configure `vercel.json` for backend routing   | High     | ✅ Done   |
| 1.20| Set up environment variables on Vercel         | Medium   | Deferred  |

### Deliverables

- [x] User can register and log in
- [x] JWT-protected API routes work
- [x] Database schema deployed (SQLite local, PostgreSQL ready)
- [x] Backend runs locally and as Vercel serverless function
- [x] Frontend auth flow complete (login, register, logout)

---

## 3. Phase 2 — Workflow Builder ✅

**Goal:** Fully functional visual drag-and-drop workflow builder in the frontend.

### Frontend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 2.1| Expand Node Library with all SRS node types (22 nodes) | High | ✅ Done |
| 2.2| Implement drag-from-library-to-canvas functionality | High | ✅ Done |
| 2.3| Create custom node components per type with distinct visuals | High | ✅ Done |
| 2.4| Build Inspector Panel — dynamic form based on selected node | High | ✅ Done |
| 2.5| Implement node connection validation rules (no self-loops, no cycles, no duplicates) | Medium | ✅ Done |
| 2.6| Add command palette (Ctrl/Cmd+K) for quick node search | Medium | ✅ Done |
| 2.7| Implement undo/redo for canvas actions          | Medium   | ✅ Done   |
| 2.8| Add minimap and zoom controls                   | Low      | ✅ Done   |
| 2.9| Workflow metadata form (name, description, status) | Medium | ✅ Done   |

### Node Library (22 nodes across 7 categories)

| Category  | Nodes |
|-----------|-------|
| Triggers  | Manual Trigger, Schedule, Webhook |
| AI        | Generate Script, Text Summarizer, Prompter |
| Voice     | Text to Speech, Voice Clone |
| Video     | Render Video, Clip Joiner |
| Social    | YouTube Publisher, TikTok Publisher, Meta Publisher |
| Logic     | If/Else, Loop, Delay, Merge |
| Utilities | Set Variable, HTTP Request, Notification, Logger |

### Deliverables

- [x] User can drag nodes from library onto canvas
- [x] Nodes can be connected with edges (with validation)
- [x] Selecting a node opens inspector with config form
- [x] All 7 node categories represented with distinct visual styles
- [x] Command palette works for quick node insertion (Ctrl+K)
- [x] Workflow metadata editing (name, description, status)

---

## 4. Phase 3 — Workflow Persistence & Execution ✅

**Goal:** Workflows save to database, load on return, and execute node-by-node.

### Backend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 3.1| Extend Prisma schema (WorkflowExecution model) | High     | ✅ Done   |
| 3.2| `POST /api/workflows` — create workflow         | High     | ✅ Done   |
| 3.3| `GET /api/workflows` — list user workflows      | High     | ✅ Done   |
| 3.4| `GET /api/workflows/:id` — get workflow detail   | High     | ✅ Done   |
| 3.5| `PUT /api/workflows/:id` — update workflow       | High     | ✅ Done   |
| 3.6| `DELETE /api/workflows/:id` — delete workflow     | High     | ✅ Done   |
| 3.7| `POST /api/workflows/:id/duplicate` — duplicate   | Medium   | ✅ Done   |
| 3.8| `POST /api/workflows/:id/execute` — run workflow  | High     | ✅ Done   |
| 3.9| Build workflow execution engine (topological sort + sequential runner) | High | ✅ Done |
| 3.10| Log execution results per node (input, output, status, duration) | High | ✅ Done |
| 3.11| `GET /api/workflows/:id/executions` — execution history | Medium | ✅ Done |

### Frontend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 3.12| Auto-save workflow to backend on changes (1.5s debounce) | High | ✅ Done |
| 3.13| Load workflow from backend on page open        | High     | ✅ Done   |
| 3.14| Run button triggers backend execution          | High     | ✅ Done   |
| 3.15| Display real execution logs in RunLogs panel   | High     | ✅ Done   |
| 3.16| Show node status (success/error/running) visually on canvas | Medium | ✅ Done |
| 3.17| Dashboard — list real workflows from API       | Medium   | ✅ Done   |
| 3.18| Implement delete and duplicate from dashboard  | Medium   | ✅ Done   |

### Deliverables

- [x] Workflows persist in SQLite (PostgreSQL ready)
- [x] Builder loads saved workflows
- [x] User can execute a workflow and see real logs
- [x] Dashboard shows real data from database
- [x] Each node execution is logged with status, duration, input and output

---

## 5. Phase 4 — AI & External Integrations ✅

**Goal:** Connect real AI services and social media APIs to node execution.

### Backend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 4.1| Implement LLM node executor (OpenAI / Anthropic API) | High | ✅ Done |
| 4.2| Implement TTS node executor (OpenAI / ElevenLabs) | High   | ✅ Done   |
| 4.3| Implement Meta publishing node executor         | Medium   | ✅ Done (placeholder — requires OAuth) |
| 4.4| Implement TikTok publishing node executor       | Medium   | ✅ Done (placeholder — requires OAuth) |
| 4.5| User API key storage (encrypted in DB via AES-256-GCM) | High | ✅ Done |
| 4.6| `GET/POST/DELETE /api/settings/keys` — manage API keys | High | ✅ Done |
| 4.7| Implement conditional (branch) logic node       | Medium   | ✅ Done   |
| 4.8| Implement delay node (real async wait, capped at 5min) | Low | ✅ Done |
| 4.9| Implement real HTTP Request executor (fetch with timeout) | Medium | ✅ Done |

### Frontend Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 4.10| Settings page for managing API keys           | High     | ✅ Done   |
| 4.11| Show real AI output in execution logs          | Medium   | ✅ Done   |
| 4.12| Node config forms for API-specific parameters (provider, model) | Medium | ✅ Done |
| 4.13| Settings link in Dashboard user menu           | Low      | ✅ Done   |

### Node Executors Implemented

| Executor         | Real API Call | Notes |
|------------------|---------------|-------|
| LLM (OpenAI)    | ✅ Yes        | GPT-4o, GPT-4o-mini, etc. via OpenAI SDK |
| LLM (Anthropic) | ✅ Yes        | Claude models via REST API |
| TTS (OpenAI)    | ✅ Yes        | tts-1, tts-1-hd voices via OpenAI SDK |
| TTS (ElevenLabs)| ✅ Yes        | Voice synthesis via REST API |
| HTTP Request     | ✅ Yes        | Real fetch with configurable method, headers, body, timeout |
| If/Else          | ✅ Yes        | Field-based (equals, contains, etc.) and expression conditions |
| Delay            | ✅ Yes        | Real async wait, capped at 300s |
| Logger           | ✅ Yes        | Console log + output passthrough |
| Trigger          | ✅ Yes        | Emits timestamp and type |
| Social (Meta/TikTok/YouTube) | Placeholder | Requires OAuth flow (Phase 7) |
| Video (Render/Clip Joiner)   | Placeholder | Requires FFmpeg integration (Phase 7) |

### Deliverables

- [x] LLM node generates real scripts via OpenAI/Anthropic API
- [x] TTS node produces audio from text via OpenAI/ElevenLabs API
- [x] Social nodes have placeholder executors (OAuth required for real publishing)
- [x] Users can securely store their API keys (AES-256-GCM encrypted)
- [x] Conditional logic works in workflows (field_check and expression modes)
- [x] HTTP Request node makes real HTTP calls
- [x] Delay node performs real async waits
- [x] Settings page with full API key CRUD management

---

## 6. Phase 5 — Polish & Deploy MVP ✅

**Goal:** Production-ready MVP deployed to Vercel.

### Tasks

| #  | Task                                          | Priority | Status    |
|----|-----------------------------------------------|----------|-----------|
| 5.1| Error boundary and global error handling (React ErrorBoundary) | High | ✅ Done |
| 5.2| Loading states and skeleton screens (Dashboard) | Medium  | ✅ Done   |
| 5.3| Toast notifications for all actions (Sonner)    | Medium   | ✅ Done   |
| 5.4| Dark/Light mode with localStorage persistence   | Low      | ✅ Done   |
| 5.5| Rate limiting on auth endpoints (express-rate-limit) | High | ✅ Done |
| 5.6| Security headers + input sanitization (Helmet)  | High     | ✅ Done   |
| 5.7| Frontend Vercel config (vercel.json + SPA rewrites) | High | ✅ Done |
| 5.8| Backend Vercel serverless config (api/index.ts) | High     | ✅ Done   |
| 5.9| Environment variable docs (.env.example updated) | High    | ✅ Done   |
| 5.10| End-to-end smoke test                          | High     | ✅ Done   |
| 5.11| User-facing README with full documentation      | Low      | ✅ Done   |

### Security Measures

| Measure | Implementation |
|---------|---------------|
| Auth rate limiting | 20 req/15min (login), 5 req/hr (register) |
| API rate limiting | 100 req/min general |
| Security headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Prisma ORM (parameterized queries) |
| API key encryption | AES-256-GCM at rest |
| Error sanitization | Internal errors hidden in production |
| Password hashing | bcryptjs |

### Deliverables

- [x] Vercel deployment configs ready (frontend + backend)
- [x] Auth, builder, execution, and integrations all working locally
- [x] No critical errors or security vulnerabilities
- [x] Dark/light mode with persistence working
- [x] Clean error handling throughout (ErrorBoundary + toast notifications)
- [x] Rate limiting and security headers on all API endpoints
- [x] Comprehensive README with setup, API docs, and deployment guide

---

## 7. Post-MVP Phases

### Phase 6 — Scheduling & Queues

- Add cron-based workflow triggers (Vercel Cron for simple, BullMQ for complex).
- Migrate backend to persistent server (Railway/Render) if needed.
- Add Redis + BullMQ for background job processing.

### Phase 6b — In-app voice cloning & TTS playback ✅

**Goal:** Let users upload their voice in the app and have the app create the clone via the provider’s API, so “my voice” is generated from their samples without leaving the app. Also: playable TTS output in the UI and run log persistence so audio is available after reload.

**Current state:** For **ElevenLabs**, when the user creates a profile with no Voice ID (optional), uploads samples, and clicks **Train** (“Clone my voice”), the backend calls ElevenLabs `POST /v1/voices/add` with the sample files (downloaded from S3), receives `voice_id`, and updates `VoiceProfile.providerVoiceId`. The voice.tts node uses that cloned voice and selects the **multilingual** model when the profile language is not English (e.g. Arabic). TTS output is stored in S3; the frontend can play it via a presigned URL. A **Preview Output** node shows and plays the last run’s output (including audio) on the canvas and in the Inspector; the latest execution is loaded when opening a workflow so audio remains available after page reload. Azure still requires a pre-set voice name; in-app cloning for Azure is not implemented.

**Done:**

| #   | Task | Priority | Status   |
|-----|------|----------|----------|
| 6b.1 | **ElevenLabs:** Integrate Add Voice API — on Train, download assets from S3, call `POST /v1/voices/add`, update profile with returned `voice_id`. | High | ✅ Done |
| 6b.4 | **UX:** Voice profiles create allows optional Voice ID for ElevenLabs; detail shows “Clone from samples” when empty; Train button shows “Clone my voice (ElevenLabs)” when applicable. | Medium | ✅ Done |
| 6b.5 | **Language-aware TTS:** Use ElevenLabs `eleven_multilingual_v2` when voice profile language is not English (e.g. Arabic); monolingual for English. | High | ✅ Done |
| 6b.6 | **Preview Output node:** Pass-through utility node; view/play upstream output. Audio player in Logs and in Inspector “Last run output” when selected. | High | ✅ Done |
| 6b.7 | **Playable audio:** Voice TTS output includes `audioKey`; `GET /api/storage/play?key=...` returns short-lived presigned S3 URL; frontend `AudioPlayer` fetches URL and plays in browser (Logs + Inspector). | High | ✅ Done |
| 6b.8 | **Audio on node:** Inline audio player on the Preview Output node on the canvas when last run has audio. | Medium | ✅ Done |
| 6b.9 | **Run log persistence:** On workflow open, fetch latest execution and restore `runLog` so audio and output are available after page reload. | High | ✅ Done |

**Remaining:**

| #   | Task | Priority | Status   |
|-----|------|----------|----------|
| 6b.2 | **Async / polling:** If cloning takes too long, run train as a BullMQ job and poll or webhook; show “Cloning…” in UI until ready. | High | Not started |
| 6b.3 | **Azure:** Integrate Custom Neural Voice (or equivalent) so Azure users can clone from samples in-app. | Medium | Not started |

**Deliverables (done):**

- User creates profile (no Voice ID) → uploads samples → clicks “Clone my voice” → app calls ElevenLabs add-voice → profile gets cloned `providerVoiceId` → voice.tts generates speech in the user’s cloned voice.
- Non-English (e.g. Arabic) profile + text → TTS uses multilingual model → clear, understandable output.
- Voice TTS → Preview Output node → audio playable in Logs, in Inspector “Last run output”, and inline on the node; play via presigned URL (S3).
- Opening a workflow (including after reload) restores the latest run log so Preview Output and Logs show the last run’s audio.

### Phase 7 — Automated video edit pipeline & review gate

**Goal:** A fully automated editing node that produces a draft video from clips + voiceover, an optional human-in-the-loop review gate (approve / tweak EDL), then final render and publish.

**High-level flow:** Script → Voiceover → **video.auto_edit** → **review.approval_gate** → **video.render_final** → Publish.

---

#### Node A: `video.auto_edit` (fully automated)

| | |
|--|--|
| **Inputs** | `clips: Array<{ url: string; durationSec?: number; tags?: string[] }>`, `voiceoverUrl: string`, `captionsSrtUrl?: string` |
| **Config** | `aspectRatio: "9:16" \| "1:1" \| "16:9"` (default `"9:16"`), `stylePreset: "documentary" \| "energetic" \| "calm"` (default `"documentary"`), `minClipSec` (default 1.5), `maxClipSec` (default 3.5), `enableMusic?: boolean` (default false), `seed?: number` (optional) |
| **Output** | `projectId: string`, `edlUrl: string` (EDL JSON in S3), `draftVideoUrl: string` (draft mp4 in S3) |

---

#### Node B: `review.approval_gate` (human-in-the-loop)

| | |
|--|--|
| **Inputs** | `projectId`, `draftVideoUrl`, `edlUrl` (from upstream) |
| **Config** | `mode: "auto_approve" \| "manual_review" \| "manual_with_timeout"`, `autoApproveAfterSec?: number` (only when `manual_with_timeout`) |
| **Behavior** | **auto_approve:** pass-through, output `approvedEdlUrl` = input EDL. **manual_review:** workflow pauses until user Approve/Edit. **manual_with_timeout:** pause with optional auto-approve after timeout. |
| **Output** | `approvedEdlUrl: string` (original or updated EDL URL) |

---

#### Node C: `video.render_final`

| | |
|--|--|
| **Inputs** | `projectId`, `approvedEdlUrl`, `voiceoverUrl`, `captionsSrtUrl?` |
| **Output** | `finalVideoUrl: string` (mp4 in S3) |

---

#### A) EDL format and validation

- **Schema (JSON):**
  - `timeline: Array<{ clipUrl, inSec, outSec, startSec }>`
  - `overlays: Array<{ type: "text", text, startSec, endSec, position, style }>`
  - `audio: { voiceoverUrl, musicUrl?, voiceGainDb?, musicGainDb? }`
  - `output: { width, height, fps }`
- Validate EDL with **Zod** (shared schema backend + frontend).

---

#### B) Auto-edit algorithm (MVP)

- Probe voiceover duration (e.g. ffprobe).
- Select clips to cover voiceover duration; trim each to `[minClipSec..maxClipSec]`; concatenate in order.
- If captions provided: add hook overlay from first caption / first sentence (e.g. first 1.5s).
- Produce EDL JSON → upload to S3.
- **Draft preview:** FFmpeg: concat clips, scale/crop to aspect ratio, add voiceover, optional low-volume music; burn subtitles if `captionsSrtUrl` provided. Upload draft mp4 to S3.

---

#### C) Execution engine changes

- Add step status **`WAITING_FOR_REVIEW`** (or equivalent).
- **Pause/resume:**
  - When approval gate is in manual modes: mark run/step as waiting; stop downstream execution.
  - Store **`resumeToken`** / **`reviewSessionId`** in DB.
- **Resolve endpoint:**  
  `POST /api/runs/:runId/steps/:stepId/resolve-review`  
  Body: `{ action: "approve" \| "edit", approvedEdl?: object }`.  
  If `action === "edit"`: validate EDL, upload new EDL to S3, then resume with `approvedEdlUrl`.
- **manual_with_timeout:** Schedule delayed job (e.g. BullMQ) to auto-approve if not resolved by `expiresAt`.

---

#### D) Data model

- **`video_projects`:** `id`, `userId`, `runId`, `createdAt`, `draftVideoUrl`, `edlUrl`, `approvedEdlUrl?`, `status`.
- **`review_sessions`:** `id`, `runId`, `stepId`, `projectId`, `status` (pending / resolved / expired), `expiresAt?`, `createdAt`, `resolvedAt?`.

(Migration scripts to add these tables.)

---

#### E) Frontend (MVP)

- **Builder:** Add the three nodes to the node library (icons + inspector config forms).
- **Run logs panel:** When step is `WAITING_FOR_REVIEW`, show CTA: **“Review draft”**.
- **Review modal/page:**
  - Video player for `draftVideoUrl` (presigned or play endpoint).
  - Buttons: **Approve**, **Edit**.
  - **Edit (MVP):** Simple editor: reorder clips (drag list), trim in/out sliders per clip, edit hook text overlay → **Save** → POST updated EDL to resolve endpoint.
- Premium UI: smooth animations, consistent with existing design.

---

#### F) Tests

- **Unit:** EDL validation (Zod); auto-edit clip selection / duration logic.
- **Integration:** Approval gate pause/resume (mock queue + DB); resolve endpoint with approve/edit.
- **Mock FFmpeg** in tests (no real binaries in CI).

---

#### Deliverables (Phase 7)

- [x] EDL schema + Zod validation; S3 upload helpers for EDL and video.
- [x] Node executors: `video.auto_edit`, `review.approval_gate`, `video.render_final`.
- [x] Execution engine: `WAITING_FOR_REVIEW`, pause/resume, resolve-review endpoint.
- [ ] **manual_with_timeout:** Optional timeout job (BullMQ delayed job) to auto-approve if not resolved by `expiresAt`.
- [x] Prisma models + migrations: `video_projects`, `review_sessions`.
- [x] Frontend: 3 nodes in library, run logs “Review draft” CTA, review modal (play, Approve, Edit with basic EDL editor).
- [x] Sample workflow JSON: script → voiceover → auto_edit → approval_gate → render_final → publish.
- [x] No secrets in logs; reuse existing S3 config for all uploads.

**Remaining (Phase 7):** `manual_with_timeout` if needed. Voiceover duration probing implemented (ffprobe in `video.auto_edit`).

---

### Phase 7a — Instagram-Style EDL Editor (MVP) ✅

**Status:** Implemented (February 2026). Phase 1 UI/UX rework complete: mobile-first, tool-driven layout with bottom sheets.

**Goal:** Keep Auto Edit fully automated. Add a **Review/Edit** flow that opens a visual EDL editor. Allow editing and quick re-render of draft preview. Redesign editor to feel like Instagram Edits / CapCut: tool-driven, bottom sheets, thumbnail timeline.

**Prerequisites:** Phase 7 (video.auto_edit, review.approval_gate, video.render_final, VideoProject, ReviewSession) in place.

---

#### 1. Backend requirements

##### A) EDL schema (extend existing; backward compatible) ✅

Implemented in `backend/src/edl/schema.ts`: optional `id` on timeline and overlays; optional `stylePreset` on text overlays; optional `color: { saturation?, contrast?, vibrance? }`; optional `musicEnabled`, `musicVolume`, `voiceVolume` on audio (with backward compat for `voiceGainDb`/`musicGainDb`). `clipUrl` accepts any non-empty string (including `s3://`).

**Target EDL structure (Zod-validated):**

| Section    | Field / shape | Notes |
|-----------|----------------|-------|
| **timeline** | `id: string`, `clipUrl: string`, `inSec: number`, `outSec: number`, `startSec: number` | Add `id` for UI drag/reorder; keep existing fields. |
| **overlays** | `id: string`, `type: "text"`, `text: string`, `startSec`, `endSec`, `stylePreset: string` | Add `id`; support `stylePreset` (alias or replace `style`). Presets: e.g. `bold_white_shadow`, `yellow_caption`, `minimal_lower`. |
| **audio**   | `voiceoverUrl: string`, `musicUrl?: string`, `musicEnabled: boolean`, `musicVolume: number` (0–1), `voiceVolume: number` (0–1) | Add `musicEnabled`, `musicVolume`, `voiceVolume`; keep or map existing gain fields for backward compatibility. |
| **color**   | `saturation: number`, `contrast: number`, `vibrance: number` | New optional block; defaults (e.g. 1.0) when absent. |
| **output**  | `width`, `height`, `fps` | Unchanged. |

- Validate with **Zod**; allow older EDLs (no `id`, no `color`, gain Db) via `.optional()` / defaults so existing auto_edit output and stored EDLs remain valid.

##### B) API endpoints ✅

| Method | Route | Description | Auth |
|--------|--------|-------------|------|
| GET    | `/api/projects/:projectId` | Project detail (for polling after render). | Required |
| GET    | `/api/projects/:projectId/edl` | Return EDL JSON (from S3). User must own project. | Required |
| POST   | `/api/projects/:projectId/edl/update` | Validate EDL body with Zod; store to S3; update project’s `edlUrl`. | Required |
| POST   | `/api/projects/:projectId/render-draft` | Enqueue async draft re-render (BullMQ `draft-render` queue when Redis set); else run in-process. Returns 202 + jobId or 200 + draftVideoUrl. | Required |

Implemented: `backend/src/routes/projects.ts`, `backend/src/services/projects.ts`, `backend/src/lib/draftRenderQueue.ts`.

##### C) FFmpeg adjustments (modular) ✅

Implemented in `backend/src/video/render.ts` and `backend/src/video/subtitles.ts`:

1. **Clip trim** — in place (inSec/outSec).
2. **Reorder** — timeline sorted by `startSec` before concat.
3. **Color filters** — `buildColorFilter(edl.color)` using `eq=saturation=X:contrast=Y` (vibrance mapped to brightness); applied when `edl.color` present.
4. **Music** — `musicEnabled === true` + `musicUrl`: fetch music, mix with voice at `voiceVolume`/`musicVolume` (0–1); fallback from `voiceGainDb`/`musicGainDb`.
5. **Draft vs final bitrate** — `isDraft: true` → 4 Mbps; otherwise 10 Mbps.
6. **Subtitle style presets** — `buildAssFromEdl(edl)` generates ASS from text overlays; three styles: bold_white_shadow, yellow_caption, minimal_lower. Burn-in via `ass` filter when overlays exist.

Backward compatible when EDL has no `color` or music.

---

#### 2. Frontend requirements ✅

- **Review node UI:** “Edit” button opens full-screen EDL Editor (portal to `document.body`); “Edit EDL (JSON)” remains for raw JSON. Implemented in `ReviewModal.tsx`.

**EDL Editor — Phase 1 UI/UX rework (Instagram Edits–style):**

- **Entry:** `EdlEditor.tsx` — loads EDL, resolves play URL, holds save/export logic, keyboard shortcuts; renders `EditorPage`.
- **Layout:** `EditorPage.tsx` — full-screen; top bar + centered 9:16 preview + timeline + bottom tool bar. Responsive (mobile-first); on desktop same structure, tool controls in bottom sheets.
- **Top bar** (`EditorTopBar.tsx`): Back (X), title “Edit draft”, resolution badge (e.g. 1080p), save indicator (“Saving…” / “Saved”), **Export** button (replaces “Save & Re-render”).
- **Preview:** `LivePreviewPlayer` — single video element keyed as `preview-video` (no remount on clip change); maps timeline time to active clip and source time; play/pause and timeupdate on same element so play icon hides during playback and playhead stays in sync. Boundary logic switches clip by updating `video.src`/`currentTime`/`play()` and calls `onTimeUpdate(nextClip.startSec)` for a stable cut. Time rounded to 0.05s to reduce jitter. `TimelineTracks` smooths the blue playhead line with RAF interpolation (lerp toward `playheadSec`) and snaps on seek (>0.5s jump). Color filter (saturation/contrast/vibrance) applied via CSS.
- **Timeline** (`TimelineTracks.tsx`): Thumbnail-style track — clip blocks with label + duration; drag-to-reorder (DnD-kit); playhead scrubber (smoothed); selection by `selectedClipId` (outline/ring). Trim is in **Trim** tool sheet when a clip is selected.
- **Tool bar** (`ToolBar.tsx`): Bottom, horizontally scrollable icons — **Adjust**, **Audio**, **Captions**, **Trim** (Trim disabled when no clip selected). Tapping a tool opens the corresponding bottom sheet.
- **Tool sheets** (shadcn `Sheet` side="bottom"): **AdjustSheet** (saturation, contrast, vibrance + Reset), **AudioSheet** (voice volume, music toggle, music volume), **CaptionsSheet** (subtitle style presets per overlay), **TrimSheet** (In/Out sliders for selected clip). Open/close driven by `activeTool` in store.
- **State:** `edlEditorStore` (Zustand): `selectedClipId`, `activeTool`, `saveStatus`; reset on editor unmount.
- **Export flow:** Export button → POST edl/update → POST render-draft; progress (spinner, disabled controls); toast on success/error; poll project for new draft URL when queued.
- **Keyboard:** Space = play/pause; Cmd/Ctrl+S = Export.

**File structure:** `frontend/src/components/builder/editor/` — `EditorPage.tsx`, `EditorTopBar.tsx`, `PreviewPlayer.tsx`, `TimelineTrack.tsx`, `ToolBar.tsx`, `AdjustSheet.tsx`, `AudioSheet.tsx`, `CaptionsSheet.tsx`, `TrimSheet.tsx`, `editorLib.ts`. Store: `frontend/src/store/edlEditorStore.ts`. API unchanged: `projectsApi` in `frontend/src/lib/api.ts`.

---

#### 3. Performance strategy

- **Draft render:** lower bitrate (e.g. 4 Mbps), faster preset if needed.
- **Final render:** full quality (8–12 Mbps).
- **Re-render only on Save** — not on every slider move.
- **Debounce** slider/control changes (500 ms) before marking dirty and enabling Save.

---

#### 4. Phase 2 (future) — design for extension (do not implement yet)

Architecture should allow later:

- Transitions between clips
- Speed ramp per clip
- Keyframe-based animation
- Template packs (stored presets: overlays + color + transitions)
- Optional Remotion renderer

**Pluggable render engine:** abstract behind an interface (e.g. `Renderer` with `renderDraft(edl, options)` / `renderFinal(edl, options)`). Implementations:

- `FFmpegRenderer` (current)
- `RemotionRenderer` (future)

Structure code so that adding a new renderer does not require changing the EDL schema or the API contract; only the implementation behind the same endpoints.

---

#### 5. Deliverables (Phase 7a)

- [x] Backend: EDL schema extensions (Zod) with backward compatibility; controllers/services for GET/POST projects/:projectId/edl, POST edl/update, POST render-draft; draft-render queue worker.
- [x] Updated FFmpeg render logic: trim, reorder by startSec, color filters, music toggle + volumes; draft vs final bitrate. ASS subtitle burn-in with style presets.
- [x] Frontend: “Edit” button in Review node UI; full-screen EDL Editor (horizontal drag timeline, trim panel, color/music/voice sliders, subtitle preset dropdown, Save & Re-render with progress).
- [x] Example EDL: `documents/example-edl-phase7a.json` (color, musicEnabled, stylePreset, id on clips/overlays).
- [x] Sample workflow: `documents/sample-workflow-video-pipeline.json`; Edit path uses new editor.

**Constraints:** Strong typing; clean modular design; no breaking changes to existing `video.auto_edit`; backward compatibility for older EDLs.

---

#### 6. What’s next (after Phase 7a)

**Editor feature — next steps:**

| Priority | Item | Notes |
|----------|------|-------|
| 1 | ~~**Phase 7a Phase 1 UI rework**~~ | ✅ Done: full-screen editor, top bar (Export, save indicator), 9:16 preview, thumbnail timeline, bottom tool bar, tool sheets (Adjust, Audio, Captions, Trim), edlEditorStore, keyboard shortcuts. |
| 2 | ~~**Real clip thumbnails in timeline**~~ | ✅ Done: timeline resolves S3 clip URLs to presigned play URLs; `VideoThumbnailStrip` shows frame at `inSec` (or Film placeholder until loaded / when URL not playable). Client-side decode only; optional backend thumbnail endpoint deferred. |
| 2.5 | ~~**Mobile edit page: clickable + timeline scroll**~~ | ✅ Done: editor portaled to `document.body` from Builder; Inspector sheet closed when opening editor (avoids Radix body `pointer-events: none`); body pointer-events safeguard in EdlEditor; focus on close button on mount (rAF); timeline clips `touch-pan-x` for horizontal scroll; SortableVideoClip mergedRef. |
| 3 | ~~**Split clip (UI + backend)**~~ | ✅ Done: Split at playhead in ContextualActionBar (video clip + playhead inside); keyboard S; 44px touch targets; EDL on Save; multi-clip supported. |
| 4 | ~~**Overlay editing in editor**~~ | ✅ Done: Captions sheet edits text, startSec, endSec, style; add/remove overlays; Delete overlay in ContextualActionBar + Delete key; clamping; Text track “Add captions” button when empty opens Captions panel.
| 4.5 | ~~**Preview & playhead fixes**~~ | ✅ Done: Live preview (single video, no remount at boundaries); play icon/playhead in sync; time rounded to 0.05s + onTimeUpdate at cut; TimelineTracks RAF-smoothed playhead line, snap on seek. |
| 4.6 | ~~**EDL editor: save-on-close + Save draft**~~ | ✅ Done: Edits persist when closing (save-on-close when dirty); Save button and Ctrl+S save EDL only (no re-render); Export/Upload still does save + re-render. |
| 4.7 | ~~**Adjust Reset button contrast**~~ | ✅ Done: Reset button text set to dark (e.g. text-gray-900) for readability on light background. |
| 5 | **Desktop: optional right panel for tools** | On desktop, consider showing active tool controls in a right-side panel instead of (or in addition to) bottom sheet for faster access. |
| 6 | **Delete selected clip** | If backend supports removing a clip from EDL (reflow startSec), add Delete to tool bar and Del keyboard shortcut. |
| 7 | **Replace editor with scene-editor-main template** | Plan in §8 (Phase 7a): component mapping, EDL↔template data mapping, wiring, CSS, step-by-step replacement. Template: TopBar, VideoPreview (→ keep LivePreviewPlayer), PlaybackControls, Timeline, BottomToolbar, ClipToolbar, ExportModal, SlipMode. Keep EdlEditor shell, EDL API, live preview, slip/split/trim logic; replace layout and UI with template. |

**Other (unchanged):**

| Priority | Item | Notes |
|----------|------|-------|
| 7 | ~~**Phase 7:** Voiceover duration probing~~ | ✅ Done. |
| 8 | **Phase 7:** manual_with_timeout | Optional: BullMQ delayed job to auto-approve review if not resolved by `expiresAt`. |
| 9 | **Phase 6b.2:** Async voice cloning | Run ElevenLabs train as BullMQ job; polling or webhook + “Cloning…” UI. |
| 10 | **Phase 7a/2:** Pluggable renderer | Abstract `VideoRenderer` interface; then Phase 2 (transitions, speed ramp, keyframes, template packs). |

---

#### 7. Assessment and notes

- **Scope:** Phase 7a delivered: one full-screen editor, projects API (GET project, GET/POST edl, POST render-draft), and FFmpeg extensions. Re-render on Save only; no live encoding on slider move.
- **EDL schema:** Adding optional `id` and `stylePreset`, and a separate `color` block with defaults, keeps existing EDLs valid. Consider normalizing `voiceGainDb`/`musicGainDb` to `voiceVolume`/`musicVolume` in the schema with a compatibility layer when reading old EDLs so the editor always works in 0–1.
- **Projects API:** `projectId` already exists (VideoProject.id). Ensure GET/POST EDL and render-draft verify `userId` from JWT matches `VideoProject.userId`. If EDL is stored only in S3 and key is on the project, GET can resolve from `edlUrl` (presigned or proxy).
- **Queue:** Reusing the existing queue with a new job type (e.g. `draft-render`) is simpler than a separate queue; worker can branch on job type. Alternatively a dedicated `draft-render` queue keeps workflow execution and heavy FFmpeg jobs separated (recommended if same Redis is used for both).
- **Frontend:** Phase 1 UI rework delivers a mobile-first, tool-driven editor: top bar with Export and save indicator, centered 9:16 preview, thumbnail-style timeline with playhead and drag-to-reorder, bottom tool bar (Adjust, Audio, Captions, Trim), and bottom sheets for each tool. Same API and EDL contract; no backend changes.
- **Phase 2 readiness:** Abstracting the renderer behind an interface (e.g. `VideoRenderer`) in the service layer makes Remotion or other backends a drop-in later without changing API or EDL contract.

---

#### 8. Replace video editor with scene-editor-main template (plan)

**Objective:** Replace the current EDL editor UI with the new template from `frontend/scene-editor-main`, while keeping Mohtawa’s EDL data model, API (projects, EDL, render-draft), and existing behaviour (live preview, slip, split, trim, overlays). Only the planning is below; no implementation.

---

##### 8.1 Template overview (`frontend/scene-editor-main`)

- **Stack:** Vite, React, TypeScript, shadcn-ui, Tailwind. No React Query in the template’s editor flow; no DnD library (template timeline is static layout + trim drag).
- **Entry:** `src/pages/Index.tsx` — single page with local state only (no projectId, no API).
- **Layout:** Fixed full-screen: TopBar → VideoPreview → PlaybackControls → Timeline → (ClipToolbar **or** BottomToolbar). When a clip is selected, ClipToolbar is shown; otherwise BottomToolbar. SlipMode and ExportModal are full-screen/modal overlays.
- **Template state:** `clips` (array of `{ id, type: 'video'|'text'|'audio', start, duration, label?, selected }`), `textOverlays` (`{ id, text, x, y, selected }`), `currentTime`, `isPlaying`, `activeTool`, `selectedClipId`, `showExport`, `showSlipMode`, `exportSettings`.
- **Template components:**
  - **TopBar:** Close (X), project name dropdown, resolution badge (click → export), Export (Upload) button.
  - **VideoPreview:** 9:16 area, simulated gradient “video”, play overlay, text overlays (click to select). No real video; no `clipUrl`/EDL.
  - **PlaybackControls:** Play/pause, current time / duration, undo/redo.
  - **Timeline:** Single scrollable area; time ruler; three rows (video, text, audio) of clips; playhead line; clip trim by drag (left/right handles on selected clip); click timeline to seek. Clip shape: `start`, `duration` (template uses no `inSec`/`outSec`/`startSec`).
  - **BottomToolbar:** Horizontal scroll of tools (Audio, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker). Toggle active tool; no bottom sheets in template.
  - **ClipToolbar:** When a clip is selected: primary row (Split, Edit, TTS, Copy, Delete, Duplicate), “Edit” toggles to second row (Slip, Extract, Voice FX, Reverse, Speed, Replace). Slip opens SlipMode.
  - **ExportModal:** Resolution (HD/2K/4K), Frame rate (24/30/60), Colour (SDR/HDR). “Export Video” button. No API call.
  - **SlipMode:** Full-screen: preview (simulated), filmstrip (24 fake frames), drag to change “offset”; Cancel / Confirm. No real clip URL or `setClipSlipInAbsolute`.

---

##### 8.2 Current Mohtawa editor overview

- **Entry:** `EdlEditor.tsx` — receives `projectId`, `initialDraftVideoUrl`, `onClose`, `onSaved`. Loads EDL via `projectsApi.getEdl(projectId)`, resolves clip URLs (presigned), holds `edl`, `dirty`, save/export state, undo/redo stacks. Renders `EditorPage` with many props.
- **Layout:** `EditorPage.tsx` — EditorTopBar; main area (LivePreviewPlayer + TimelineTracks); optional desktop right panel (tool content); ContextualActionBar (clip/overlay actions); mobile: bottom sheets (Adjust, Audio, Captions, Trim). SlipModeOverlay when slip active.
- **State:** EDL from API (`edl.timeline`, `edl.overlays`, `edl.audio`, `edl.color`, `edl.output`). `edlEditorStore`: `selectedBlock`, `activeTool`, `slipMode`, `slipClipId`, `slipOriginalInSec`, `saveStatus`. Local: `playheadSec`, `videoDuration`, drag state for timeline.
- **Key components:**
  - **EditorTopBar:** Close, undo/redo, project name, resolution (from EDL), Export (opens ExportModal), save indicator, loading/error.
  - **LivePreviewPlayer:** Real video; timeline → clip mapping; single video element; play/pause, timeupdate → playhead; boundary switch; color filter; text overlays from EDL.
  - **TimelineTracks:** DnD-kit sortable video track; separate tracks for Adjust, Text, Audio, Video; thumbnails via `VideoThumbnailStrip` and `resolvedClipUrls`; playhead (smoothed); trim via TrimSheet (not inline drag in timeline); reorder, select clip, seek.
  - **ToolBar:** Adjust, Audio, Captions, Trim (Split in bar is disabled; Delete optional). Opens sheets or right panel.
  - **ContextualActionBar:** Split, Delete clip, Delete overlay, Duplicate, Slip, etc., driven by `selectedBlock` and store.
  - **Sheets:** AdjustSheet, AudioSheet, CaptionsSheet, TrimSheet (mobile bottom sheets; desktop right panel content).
  - **SlipModeOverlay:** Full-screen slip with real filmstrip (VideoThumbnailStrip), real clip URL, `setClipSlipInAbsolute`, Cancel/Confirm.
  - **ExportModal / ExportScreen:** Resolution, FPS, export trigger; Mohtawa wires to POST edl/update + render-draft + polling.

---

##### 8.3 Component mapping: what to replace with what

| Template component   | Current Mohtawa component | Action |
|---------------------|----------------------------|--------|
| **Index (page)**    | **EdlEditor** (wrapper) + **EditorPage** (layout) | Replace **EditorPage** layout and inner structure with template layout (TopBar → Preview → PlaybackControls → Timeline → ClipToolbar or BottomToolbar). Keep **EdlEditor** as shell: load EDL, resolve URLs, save/export, undo/redo, pass props into the new page component. |
| **TopBar**          | **EditorTopBar**          | Replace with template **TopBar** UI (X, project name, resolution, Export). Wire: `onClose`, `onExport`/`onResolutionClick`, project name from props; resolution from EDL or export settings; optionally keep undo/redo in bar or move to PlaybackControls. Add save indicator and export progress/error if desired (template has none). |
| **VideoPreview**    | **LivePreviewPlayer**     | **Do not** use template VideoPreview (fake content). Keep **LivePreviewPlayer** but optionally restyle its container to match template (e.g. same 9:16 container class, play overlay style). Template’s safe-area and overlay click (select text) can be mirrored. |
| **PlaybackControls**| (none; play in preview)   | **Add** template **PlaybackControls** between preview and timeline: play/pause, current time / total duration, undo/redo. Wire: `isPlaying`/`currentTime`/`duration` from EdlEditor/EditorPage state; `onTogglePlay` toggles video; `onUndo`/`onRedo` from EdlEditor. |
| **Timeline**        | **TimelineTracks**        | Two options: (A) Replace **TimelineTracks** with template **Timeline** and rewire: map EDL timeline + overlays + audio to template `clips` shape; implement seek, trim (inline drag), and reorder (add DnD if needed). (B) Keep **TimelineTracks** but restyle to match template (ruler, track rows, playhead, clip blocks). Prefer (A) if aiming for full template look/UX; (B) if preserving existing DnD and multi-track structure. |
| **BottomToolbar**   | **ToolBar**               | Replace **ToolBar** with template **BottomToolbar**: same tool list or subset (e.g. Audio, Text, Captions, Adjust, Trim, Overlay). Wire `activeToolId` / `onToolSelect` to `edlEditorStore.activeTool` and open existing sheets (or template-style panels) for Adjust, Audio, Captions, Trim. |
| **ClipToolbar**     | **ContextualActionBar**   | Replace **ContextualActionBar** with template **ClipToolbar** when a video clip is selected: primary row (Split, Edit, Copy, Delete, Duplicate, etc.) and “Edit” row (Slip, Extract, Voice FX, Reverse, Speed, Replace). Wire each action to existing handlers (split, delete, duplicate, slip). “Edit” can open Trim sheet; Slip opens SlipMode. |
| **ExportModal**     | **ExportModal** + **ExportScreen** | Use template **ExportModal** layout and styling (resolution, frame rate, colour segments). Wire settings to Mohtawa export options (resolution, FPS); “Export Video” triggers existing export flow (edl/update + render-draft). Optionally keep ExportScreen for progress/result. |
| **SlipMode**        | **SlipModeOverlay**       | Replace **SlipModeOverlay** UI with template **SlipMode** layout (preview on top, filmstrip, Cancel/Confirm). Keep Mohtawa slip logic: real clip, `setClipSlipInAbsolute`, real filmstrip (e.g. **Filmstrip** from current overlay). So: template SlipMode shell + current filmstrip and confirm/cancel behaviour. |

---

##### 8.4 Data model mapping (EDL ↔ template)

- **Template clip:** `{ id, type: 'video'|'text'|'audio', start, duration, label?, selected }`. One flat list; `start` = timeline start; `duration` = length.
- **Mohtawa EdlTimelineClip:** `{ id?, clipUrl, inSec, outSec, startSec }`. `startSec` = timeline start; duration = `outSec - inSec`.
- **Mapping (timeline → template):** For each `EdlTimelineClip`: `id`, `type: 'video'`, `start: clip.startSec`, `duration: clip.outSec - clip.inSec`, `selected` from store. Template has no `clipUrl`; use only for display/trim. When template reports trim (newStart, newDuration), map back: `startSec = newStart`, `inSec` unchanged for “slip” semantics or derive from trim; `outSec = inSec + newDuration` (or reflow inSec/outSec by backend contract).
- **Template text clip:** `type: 'text'` with `start`, `duration`, `label`. Mohtawa: **overlays** are separate (`startSec`, `endSec`, `text`, `stylePreset`). Map overlays to template “text” clips for one unified timeline row, or keep separate Text track and map overlay times to a synthetic “text” clip list for template Timeline.
- **Template textOverlays (preview):** `{ id, text, x, y, selected }` — position in % for overlay on preview. Mohtawa overlays have `startSec`/`endSec` and optional `position` (top/center/bottom). Derive `x`/`y` from `position` or store; selection from `selectedBlock` when type text.
- **Audio:** Template has `type: 'audio'` clips. Mohtawa has a single voiceover + optional music (EDL audio). Either one “audio” clip representing full voiceover or map to a single clip; music can be UI-only in Audio sheet.

---

##### 8.5 Wiring summary

1. **Entry:** **EdlEditor** stays. It loads EDL, resolves URLs, manages dirty/save, export (edl/update + render-draft), undo/redo. It renders the new “EditorPage” (template layout) and passes: `edl`, `resolvedClipUrls`, `playheadSec`, `setPlayheadSec`, `playing`, `setPlaying`, `onEdlChange`, `reorderClips`, `setClipTrim`, `setClipSlipInAbsolute`, `onClose`, `onExport`, `onUndo`, `onRedo`, `canUndo`, `canRedo`, etc.
2. **State:** Keep EDL as source of truth. Derive template-friendly structures (e.g. `clips` for timeline) in the new page or in a small adapter. Selection: keep `edlEditorStore.selectedBlock` / `selectedClipId`; template expects `selectedClipId` and per-clip `selected` — sync from store.
3. **Preview:** Keep **LivePreviewPlayer**; feed `edl.timeline`, `resolvedClipUrls`, `playheadSec`, `onTimeUpdate`, `edl.color`, `edl.overlays`. Play/pause can be driven by a local `playing` state or ref to video.
4. **Timeline:** If using template **Timeline**: on mount and when EDL changes, compute `clips` from `edl.timeline` (and overlays/audio if unified). `onTimeChange` → `setPlayheadSec`. `onClipTrim` → `setClipTrim` (map back to inSec/outSec/startSec). `onSelectClip` → set selected clip in store. Reorder: if template Timeline has no DnD, add it (e.g. DnD-kit) and call `reorderClips(from, to)`.
5. **ClipToolbar:** When `selectedClipId` is set and clip is video, show ClipToolbar. Split → `onSplitClipAtPlayhead`; Delete → `onDeleteClip`; Duplicate → `onDuplicateClip`; Slip → set slip mode in store and show SlipMode (with Mohtawa slip logic).
6. **BottomToolbar:** Tools open existing sheets (Adjust, Audio, Captions, Trim). Optionally restrict to template’s tool list and style.
7. **Export:** Template ExportModal opens from TopBar; on confirm, call existing `onExport(options)` from EdlEditor.
8. **SlipMode:** When slip is active, render template **SlipMode** layout but use current **SlipModeOverlay** content (filmstrip with real frames, `setClipSlipInAbsolute`, onConfirm/onCancel).

---

##### 8.6 CSS / theme

- Template uses `--editor-bg`, `--editor-surface`, `--editor-surface-hover`, `--editor-preview-bg`, `--editor-timeline-bg`, `--editor-toolbar-bg`, `--selection`, `--playhead`, `--text-layer`, `--audio-waveform`, and utilities: `.editor-glass-hover`, `.clip-selected`, `.toolbar-icon`, `.toolbar-icon-active`, `.no-scrollbar`, `.smooth-scroll`, `.ios-segmented`, `.safe-area-guide`, and keyframes `fade-in`, `slide-up`, `scale-in`.
- **Action:** Copy template’s editor CSS variables and utility classes from `scene-editor-main/src/index.css` into Mohtawa’s global CSS. In `tailwind.config.ts`, extend `theme.colors` with `editor.*`, `selection`, `playhead`, `text-layer`, `audio-waveform` if not present, and add the same keyframes/animations so that template components look correct when pasted into Mohtawa.

---

##### 8.7 Step-by-step replacement plan (implementation order)

1. **CSS/theme:** Add template editor tokens and utilities to Mohtawa `index.css` and Tailwind config (no component changes yet).
2. **TopBar:** Introduce template **TopBar** component under `frontend/src/components/builder/editor/`, wired to `onClose`, project name, resolution, `onExport`. Optionally merge in undo/redo and save indicator from current EditorTopBar. Use it in EditorPage instead of EditorTopBar.
3. **PlaybackControls:** Add template **PlaybackControls**; wire play/pause (to LivePreviewPlayer or ref), currentTime/duration from state, undo/redo from EdlEditor.
4. **BottomToolbar:** Add template **BottomToolbar**; wire tools to `activeTool` and existing sheets. Replace current ToolBar with it.
5. **ClipToolbar:** Add template **ClipToolbar**; wire Split, Delete, Duplicate, Slip, etc., to existing handlers. Show when a video clip is selected; hide when none. Replace or hide ContextualActionBar when clip is selected.
6. **Timeline:** (A) Integrate template **Timeline** and implement EDL ↔ clips adapter, seek, trim callback → setClipTrim, reorder (with DnD if added). Or (B) restyle **TimelineTracks** to match template (playhead, track styling, clip blocks). Remove or refactor TimelineTracks accordingly.
7. **Preview:** Keep LivePreviewPlayer; optionally wrap in template-style container (same aspect ratio and class names as template VideoPreview).
8. **ExportModal:** Replace or restyle current ExportModal with template ExportModal layout; keep existing export API and progress/result flow.
9. **SlipMode:** Replace SlipModeOverlay layout with template SlipMode (preview + filmstrip + footer); keep Filmstrip and `setClipSlipInAbsolute`/confirm/cancel logic.
10. **EditorPage layout:** Assemble: TopBar → LivePreviewPlayer → PlaybackControls → Timeline (or TimelineTracks) → ClipToolbar or BottomToolbar. Remove or relocate desktop right panel and mobile sheets as needed (tools still open sheets; layout follows template).
11. **Cleanup:** Remove or deprecate old EditorTopBar, ToolBar, ContextualActionBar if fully replaced. Ensure EdlEditor still receives projectId and onClose/onSaved; ensure export and save flows unchanged.
12. **Testing:** E2E or manual: open editor from Builder, load EDL, play, seek, trim, reorder, split, slip, change tools, export; verify EDL and draft URL update correctly.

---

##### 8.8 What to keep from current (do not drop)

- **EdlEditor:** ProjectId, load EDL, resolve URLs, dirty/save, export (POST edl/update + render-draft), undo/redo stacks.
- **LivePreviewPlayer:** Real video, timeline→clip mapping, single video element, boundary switch, color filter, overlays, playhead sync.
- **EDL types and API:** `EdlTimelineClip`, `EdlTextOverlay`, EDL, `projectsApi.getEdl`/`updateEdl`, render-draft.
- **Slip logic:** `setClipSlipInAbsolute`, slip store state, real filmstrip (e.g. Filmstrip component) and clamp.
- **Split/trim/delete/duplicate:** Existing handlers and backend contract (split at playhead, reflow startSec, etc.).
- **Sheets:** AdjustSheet, AudioSheet, CaptionsSheet, TrimSheet (content and EDL wiring); only their trigger (toolbar) and layout change.

---

##### 8.9 Audit: what is still not replaced (template vs current)

Comparison after the scene-editor template integration. **Do not implement** from this list unless product decides to.

| Area | Template | Current Mohtawa | Still not replaced / difference |
|------|----------|------------------|----------------------------------|
| **TopBar** | Close (X), project name + ChevronDown, resolution badge, **Upload** icon for Export. No undo/redo. | EditorTopBar: same layout with **Download** icon (and Loader2 when exporting). Undo/redo moved to PlaybackControls. Error message below bar. | **Export button icon:** template uses Upload; we use Download. Optional: align icon to Upload if desired. |
| **Preview (VideoPreview vs LivePreviewPlayer)** | 9:16 container, **safe-area-guide** (dashed border inset), **play overlay** = w-14 h-14 rounded-full bg-foreground/20 backdrop-blur-md, Play size 24. **Clickable text overlays** on preview (x/y %, clip-selected style, onSelectText(id)). | LivePreviewPlayer in template-style 9:16 container. Real video, color filter, overlays rendered by position (top/center/bottom); **no safe-area guide**; play overlay = bg-black/50 p-4, Play h-10 w-10. Overlays are **not clickable** (pointer-events-none layout). | **Safe-area guide** in preview. **Play overlay styling** (template: bg-foreground/20 backdrop-blur, w-14 h-14). **Click-to-select text overlays on preview** (template: click overlay → onSelectText; we select overlays via timeline/Captions sheet only). |
| **PlaybackControls** | Play/pause, time/duration, undo/redo. | Same; wired. | — Replaced. |
| **Timeline** | **Single component:** 3 rows (video, text, audio). **Inline trim** by dragging left/right handles on selected clip. **No DnD reorder.** Time ruler: **half-second ticks** (text-[9px], small lines), ml-2. **Duration badge** above clip when selected or trimming (e.g. "2.5s", bg-selection or bg-primary). **Dimmed overlay + ring-selection/20** when trimming. Clip styles: video = bg-editor-surface, text = bg-text-layer/30, audio = bg-audio-waveform/10; clip-selected / hover:ring-foreground/20. **Thumbnails** = gradient strips (no real frames); **waveform** = bar strip for audio. | **TimelineTracks:** 4 rows (Adjust, Text, Audio, Video). **Trim via Trim sheet** (no inline trim on timeline). **DnD reorder** (dnd-kit) on video track. Real **VideoThumbnailStrip**. Playhead + circle knob and editor styling applied. No duration badge above clips. No dimmed trim state on timeline. | **Timeline component:** we kept TimelineTracks, not the template Timeline. **Not replaced:** template’s **inline trim-by-drag** on timeline, template’s **time ruler** (half-second ticks, ruler layout), **duration label** above selected/trimming clip, **trim dimming + ring** on timeline, template’s **three-track only** (no Adjust row) and **track visuals** (text-layer/audio-waveform background classes for text/audio clips). |
| **BottomToolbar** | **11 tools:** Audio, Text, Voice, Links, Captions, Filters, Adjust, Overlay, Sound FX, Cutout, Sticker. | **4 tools:** Audio, Captions, Adjust, Trim. | **Tool set:** template has 11 tools; we use 4. Not replaced (by design): Text, Voice, Links, Filters, Overlay, Sound FX, Cutout, Sticker — unless product adds them. |
| **ClipToolbar** | Primary: Split, Edit, TTS, Copy, Delete, Duplicate. Edit row: Slip, Extract, Voice FX, Reverse, Speed, Replace. Edit toggles second row; only Slip + Edit wired in template. | Same structure; Split, Edit, Slip, Delete, Duplicate wired. TTS/Copy/Extract/Voice FX/Reverse/Speed/Replace present but mostly disabled. | **TTS, Copy** (and edit-row actions) not wired or placeholder. Optional: wire Copy or hide unused. |
| **ExportModal** | Resolution, Frame rate, Colour segments; single "Export Video" button; **no progress**. | Restyled to template layout; **progress** and exporting state kept. | — Replaced (look); behaviour intentionally richer (progress). |
| **SlipMode** | Simulated preview (gradient); **24 fake filmstrip frames** (gradient blocks); drag filmstrip to change offset; instruction; Cancel/Confirm (icons only). | SlipModeOverlay: **real video** preview, **real Filmstrip** (thumbnails), real slip logic; template layout/styling applied. | **Filmstrip:** template = fake gradient frames; we use real Filmstrip. No change needed. Optional: template’s **drag-to-slide** filmstrip UX could be compared to our Filmstrip UX. |
| **Desktop right panel** | Template has **no** right panel; tools only toggle toolbar. | **Aside** with Adjust/Audio/Captions/Trim sheet content when tool active. | We have **more** than template (tool content in panel). Not “replaced” — we kept it. Optional: hide panel to match template (tools would only open mobile sheets). |
| **Mobile sheets** | Template has **no** bottom sheets. | AdjustSheet, AudioSheet, CaptionsSheet, TrimSheet. | We have **more** than template. Optional: remove sheets to match template (would lose tool controls on mobile unless toolbar opens something else). |
| **ContextualActionBar** | When text is selected, template still shows **BottomToolbar** (no separate bar). | When **text overlay** selected we show **ContextualActionBar** (e.g. delete overlay). | **Overlay selection UX:** template doesn’t have a dedicated overlay bar; we do. Optional: show BottomToolbar for overlay and move overlay actions into it or a sheet. |
| **Old components** | — | ToolBar.tsx, ContextualActionBar (still used for overlay). | **ToolBar** is replaced by BottomToolbar. **ContextualActionBar** still used when an overlay is selected; not removed. |

**Summary — still not replaced (optional or by design):**

1. **Preview:** Safe-area guide; template play overlay style; clickable text overlays on preview.
2. **Timeline:** Template’s Timeline component itself (we use TimelineTracks); inline trim-by-drag on timeline; duration badge above clip; time ruler with half-second ticks; trim dimming/ring; template track visuals for text/audio (text-layer, audio-waveform).
3. **TopBar:** Export icon (Upload vs Download).
4. **BottomToolbar:** Extra tools (Text, Voice, Links, Filters, Overlay, Sound FX, Cutout, Sticker) — add only if product needs them.
5. **ClipToolbar:** TTS, Copy (and edit-row actions) — wire or hide.
6. **Desktop panel / mobile sheets:** Template has neither; we kept both. Remove only if targeting template parity.
7. **ContextualActionBar:** Still used for overlay selection; template has no equivalent.

---

### Phase 7b — Ideas List + Loop (Option B)

**Goal:** One workflow can generate many videos from ideas stored in Google Docs or Notion; for each idea the user can review/edit the script before continuing.

**Status:** Planning only (no implementation yet).

---

#### 7b.0 Batch Runs — Core Architecture (Prompt 1)

**Scope:** Core execution architecture + data model + APIs only. Do **not** implement Review queue UI or Editor UI in this prompt.

**Concepts:**

| Concept | Description |
|--------|-------------|
| **Workflow** | Template stored once (nodes + edges + configs). |
| **Run** | Single batch execution that can process N items (ideas). Status: queued / running / paused / completed / failed / canceled. |
| **Iteration** | One per item from Ideas Source. Has iterationId (UUID), runId, itemIndex, itemId, title, status (queued / running / waiting / succeeded / failed / skipped). |
| **Node Step** | One execution record per node, per iteration (inside loop) or per run (outside loop). Stores inputs, outputs, status, timestamps, error. |

**Data model (DB):** See §8 Data Model — tables `runs`, `run_iterations`, `run_steps`, `run_artifacts`.

**Execution engine changes:**

1. **Context:** Every node receives an execution context: `runId`, `nodeId`, `iterationId?`, `item?`, `index`, `total`, variables/outputs map.
2. **For Each:** Input `items[]` → create one `run_iterations` row per item; execute downstream nodes once per iteration; record each node execution as `run_steps` with that iterationId. MVP: sequential (index 0..N-1); design so parallel with concurrency limit can be added later.
3. **Output addressing:** Store node outputs in `run_steps.outputsJson` with iterationId; next node in loop receives upstream outputs for the same iteration only.
4. **Aggregation:** After loop, For Each produces one step (iterationId = null) with `outputsJson`: `{ results: [{ iterationId, itemId, title, outputsByNodeId, artifacts }] }`.
5. **Failure:** If a node fails for one iteration: mark iteration failed; continue next iteration (default) or stop batch per For Each config `onError`: `"continue"` \| `"stop"`. Record error in `run_steps.errorJson`.

**API endpoints (backend):** See §9 API Routes — GET run, GET iterations, GET iteration by id, GET steps (with optional filters), POST cancel / pause / resume.

**Node contracts:**

- **Ideas Source output:** `{ items: Array<{ id, title, idea?, script?, meta? }> }`.
- **For Each input:** Accepts `{ items: [...] }` or array.
- **Variable interpolation:** Resolver for `$item.title`, `$item.idea`, `$item.script`, `$index`, `$total`; used by all nodes inside the loop.

**Tests (to add):**

1. For Each creates correct number of iterations.
2. Nodes inside loop get correct item context.
3. Outputs stored per iteration and not mixed.
4. Aggregated results output has N entries.
5. Failure in one iteration does not corrupt others (mock external services: TTS, FFmpeg, S3).

**Deliverables (Prompt 1):**

- Iteration-aware execution across all nodes.
- Persist run_iterations and run_steps for every iteration.
- For Each produces aggregated results at end.
- Run/iteration/step API endpoints implemented.
- Code modular for adding Review Queue UI later.

**Implementation order (core):** run_iterations + run_steps schema → For Each sequential execution → correct data passing per iteration → basic endpoints to inspect runs/iterations.

---

#### 7b.1 New nodes and schemas

**1) Ideas Source node (`ideas.source`)**

| | |
|--|--|
| **Provider** | Manual list, CSV, **In-app Editor** (Phase 7c), Notion, Google Docs. **MVP order:** Manual + CSV first; then In-app Editor (Phase 7c); then Notion; then Google Docs. |
| **Output** | `{ items: Array<{ id, title, idea, meta? }> }` (standard); for In-app Editor: `{ items: Array<{ id, title, ideaText, scriptText, rawBlocks, meta }> }` |

**2) Split into Items node (`text.split_items`)**

| | |
|--|--|
| **Input** | Raw text or blocks |
| **Config** | `splitMode: "headings" \| "bullets" \| "separator"` |
| **Output** | `{ items: Array<{ id, title, idea }> }` |

**3) For Each node (`flow.for_each`)**

| | |
|--|--|
| **Input** | `items[]` from upstream |
| **Behavior** | Runs downstream nodes once per item. Provides per-iteration context: `$item` (current item), `$index`, `$total`. |
| **Supports** | Sequential execution (MVP); stop/pause on manual review step; collect results into `{ results: [] }` at the end. |

**4) Write Script node (`script.write` — create or upgrade existing)**

| | |
|--|--|
| **When inside For Each** | Pre-fill editor with `title = $item.title`, `prompt seed = $item.idea`. |
| **Modes** | (A) AI generate draft script (optional toggle); (B) Manual script editor (user edits and clicks “Continue”). |
| **Output** | `{ title, idea, script, language?, style?, captions?: boolean }` |

**Deliverable (schemas):** Node definitions + Zod schemas for `ideas.source`, `text.split_items`, `flow.for_each`, `script.write` (or upgrade existing).

---

#### 7b.2 Integrations

**A) Notion Ideas Source (Phase 1 integration)**

- OAuth connection or API key (token) support.
- **Notion Database mode (recommended):**
  - User selects `databaseId`.
  - Optional filter: e.g. Status == "Ready".
  - Map properties: title → `item.title`, idea text → `item.idea` (use title if no idea field), id → `item.id`.
- **Notion Page mode:**
  - Read blocks from a `pageId`.
  - Convert headings/bullets into a single `rawText` output; feed into Split node.

**B) Google Docs Ideas Source (Phase 2 integration)**

- OAuth Google connection.
- Read doc content as plain text.
- Splitting by headings or separators via Split node.
- **Stub with TODOs** if time is limited.

**MVP priority:** (1) Manual list + CSV upload; (2) Notion database; (3) Google Docs.

---

#### 7b.3 Workflow runtime / engine behavior

- **For Each:** Execute child nodes in order for each item.
- **Iteration context** passed into node execution: `context.item`, `context.index`, `context.total`.
- **Manual review gating:** If Write Script is in manual mode, workflow run pauses until user clicks “Continue”. Store paused run state so user can resume.
- **Outputs:** For Each returns aggregated results: `{ results: [{ itemId, outputsByNodeId, finalVideoUrl? }] }`.

---

#### 7b.4 UI requirements

**Ideas Source node UI**

- Dropdown provider: Manual / CSV / Notion / Google Docs.
- **Manual mode:** Multiline textarea (each line = one idea) OR JSON array editor.
- **CSV mode:** File upload + select column for idea.
- **Notion mode:** Connect button + database/page selector + optional status filter.
- **Google mode:** Connect button + doc selector.

**Split node UI**

- `splitMode` dropdown: headings (lines starting with # or Markdown headings), bullets (- or •), separator (---).
- Output preview: show first 3 items.

**For Each node UI**

- “Sequential / Parallel (coming soon)” — parallel disabled for MVP.
- Show progress (e.g. 3/12).
- Ability to stop/cancel run.

**Write Script node UI**

- Rich text editor or simple textarea (MVP).
- “Generate with AI” toggle.
- If AI enabled: generate draft then allow edits.
- Buttons: “Continue”, “Regenerate”, “Skip”.
- Show current idea title at top.

---

#### 7b.5 Voice node: getting text from Ideas Source / current item

**Goal:** The Voice (TTS) node must speak the right text for each idea when used inside a For Each loop. That text can come from an upstream node (e.g. Write Script) or directly from the current item.

**Ways the Voice node gets text**

1. **From upstream connection (recommended when using Write Script)**  
   - Flow: Ideas Source → For Each → Write Script → **Voice** → Preview → …  
   - Write Script outputs `{ script, title, idea, … }`.  
   - Voice node has an **input** that accepts the script from the connected upstream node.  
   - So: connect the **Write Script** output to the **Voice** node's "text" or "script" input; the execution engine passes the upstream node's `script` (or chosen field) into the Voice node's input for that iteration.

2. **From current item when there is no Write Script**  
   - Flow: Ideas Source → For Each → **Voice** → Preview → …  
   - No Write Script in the loop; the text to speak is the idea or script text from the Ideas Source item.  
   - The execution engine, when running the Voice node inside For Each, injects the **current item** into the node's input (e.g. `context.item` or `inputData` from For Each).  
   - Voice node **config** (or input resolution) must define which field to use as the text to speak, e.g.:  
     - `$item.scriptText` (when Ideas Source is In-app Editor and sections include script content)  
     - `$item.idea` (short idea / one-liner)  
     - Or a single combined/fallback rule: e.g. use `scriptText` if present, else `idea`.

3. **Manual override (optional)**  
   - Config field: "Text to speak" as a static string or left empty when using upstream/current item.  
  - When empty and inside For Each: use current item's script/idea as above.  
  - When set: use that string (ignores upstream/item for that run).

---

#### 7b.6 Preview Loop Outputs node (`preview.loop_outputs`)

**Goal:** After a For Each loop generates one voiceover per item, provide a single utility node that aggregates those per-item results into a playlist-friendly shape so the UI can easily show “all clips in this loop”.

**Behavior / contract**

- **Input (from `flow.for_each`):**  
  `{ results: [{ itemId, outputsByNodeId, finalVideoUrl? }], items?: IdeaItem[] }` where `outputsByNodeId` contains downstream node outputs (e.g. Voice TTS with `audioUrl`).
- **Executor behavior:**  
  - Scan `results[]`; for each entry, look through `outputsByNodeId` values.  
  - If any downstream output has an `audioUrl`, emit an item with:  
    - `id = itemId`  
    - `title =` item title from `items[]` (fall back to idea text or id)  
    - `audioUrl` from the voice node’s output.  
  - Output shape: `{ items: Array<{ id: string; title?: string; audioUrl?: string }> }`.

**Frontend behavior**

- New utility node definition:  
  - Type: `preview.loop_outputs`.  
  - Category: Utilities.  
  - Inputs: `input` (from For Each).  
  - Outputs: `output`.  
  - Config: none (pure display/aggregation).
- Run Logs:  
  - For steps whose output matches `{ items: [...] }`, render a **Loop items** section listing each item with its title and an audio player bound to its `audioUrl`.  
  - This gives the user a quick playlist of all loop-generated clips without drilling into each iteration.

**How the Voice node should look (UI / behavior)**

- **Input handle(s):**  
  - One optional input: "Script / text" (or "Text to speak"). When connected (e.g. from Write Script), the Voice node uses that node's output (e.g. `script`) as the text for TTS.  
  - When not connected and the node runs inside For Each: engine provides the current item; Voice node uses `$item.scriptText` or `$item.idea` per config or default.

- **Config (existing):**  
  - Voice profile (e.g. "My Voice (Clone)").  
  - Format (e.g. mp3).  
  - Optional: **"Text source"** when inside a loop: "From upstream" | "Current item (script)" | "Current item (idea)" | "Manual". If "Manual", show a textarea for static text.

- **Execution contract:**  
  - Backend Voice executor receives `inputData` that includes either:  
    - the upstream node's output (e.g. `script` from Write Script), or  
    - the current item (e.g. `_item` or `context.item`) when Voice is downstream of For Each and "text" is not connected.  
  - Executor then picks the string to synthesize from config + input (upstream script vs `item.scriptText` vs `item.idea`).

**Summary**

- **With Write Script:** Voice gets text by **connection**: connect Write Script → Voice and use Write Script's `script` output.  
- **Without Write Script:** Voice gets text from **current item**: engine passes `$item` into Voice; Voice uses `$item.scriptText` or `$item.idea` (config or default).  
- Voice node UI: optional "text" input handle + config (voice profile, format, optional "Text source" in loops).

---

#### 7b.6 Deliverables and implementation order

1. **Node definitions + Zod schemas:** `ideas.source`, `text.split_items`, `flow.for_each`, `script.write` (or upgrade).
2. **Backend execution engine:** Loop context (`context.item`, `context.index`, `context.total`); pause/resume for manual review.
3. **Frontend:** Node UIs and wiring for Ideas Source (Manual + CSV), Split, For Each, Write Script.
4. **Example workflow JSON:** Ideas Source → Split → For Each → Write Script → Voice → Auto Edit → Review → Render → Publish.
5. **Tests:** Split parsing; for_each iteration; pause/resume.

**Implementation order:** Start with Manual + CSV Ideas Source, Split node, and For Each sequential loop with context passing. Then Notion database integration. Leave Google Docs stubbed with TODOs if time is limited.

---

#### 7b.7 Review Node UX + Edit Flow (Prompt 2)

**Goal:** Implement the “Review / Approve” node experience for batch runs: Review Queue for all iterations, per-iteration actions (Preview, Edit, Approve, Skip, Regenerate Draft), approval resumes only that iteration’s downstream nodes, Edit opens editor for that iteration and saves EDL. Includes backend endpoints and frontend Review node panel only; do not redesign the whole app.

**Scope:** Backend review decision storage + resume logic; review-queue and per-iteration endpoints; frontend Review Queue UI (node card badges, panel with tabs/list/actions); Edit = navigation + API wiring to open editor and save EDL (reuse existing editor).

**Status (implementation progress):**

| # | Item | Status |
|---|------|--------|
| 1 | Backend review decision storage + resume logic | ✅ Done — RunReviewDecision table; For Each loop creates pending decision per iteration, continues other iterations, sets run WAITING_FOR_REVIEW; `decideIterationReviewAndResume` (approve → run downstream for that iteration only, skip → mark only). |
| 2 | GET `/api/runs/:runId/review-queue` | ✅ Done — returns items (iterationId, itemIndex, title, status, decision, draftVideoUrl, voiceoverUrl, finalVideoUrl, lastUpdatedAt) and counts. |
| 3 | Frontend Review Queue UI (panel, list, tabs) | ⬜ Not started |
| 4 | Per-row actions (Preview, Edit, Approve, Skip, Regenerate) | ⬜ Not started |
| 5 | Tests for review decision + resume | ✅ Done — `execution.reviewDecision.test.ts` (5 tests). |
| — | POST decide endpoint | ✅ Done — `/api/runs/:runId/iterations/:iterationId/review/decide`. |
| — | GET/POST editing, regenerate-draft, rerender-draft | ⬜ Not started |

---

##### A) Review node runtime behavior (engine)

- **Per-iteration gate:** Review node runs inside the loop. For each iteration it produces a **decision**: `"pending"` | `"approved"` | `"skipped"`. Default = pending unless auto-approve.
- **If decision == "pending":** Mark iteration as WAITING (waiting_for_review); do not run downstream nodes for that iteration; continue other iterations when possible.
- **If decision == "approved":** Run downstream nodes (e.g. Render Final) for that iteration only; resume execution from the node after Review for that iteration only.
- **If decision == "skipped":** Mark iteration skipped; do not run downstream for that iteration.
- **Config:** `mode`: `"manual"` | `"auto_approve"` | `"auto_approve_after_timeout"`; `autoApproveAfterSec?`. manual ⇒ pending until user action; auto_approve ⇒ instantly approved; auto_approve_after_timeout ⇒ pending then auto-approve after timeout (delayed job per iteration).

##### B) Data model updates

- **Option 1 (simple):** Store in Review node’s `run_step.outputsJson`: `{ decision, notes?, edited? }`.
- **Option 2 (recommended):** Add table **run_review_decisions**: `id`, `runId`, `iterationId`, `nodeId`, `decision`, `notes`, `edited`, `createdAt`, `updatedAt`, `decidedAt`. Also store or resolve refs to iteration artifacts: draftVideoUrl, edlUrl/edlJson, finalVideoUrl (from run_steps/run_artifacts).

##### C) Backend API endpoints

| Method | Route | Description |
|--------|--------|-------------|
| GET | `/api/runs/:runId/review-queue` | List iterations for Review: iterationId, itemIndex, title; statuses (draft ready, review decision, render status); draftVideoUrl, voiceoverUrl?, finalVideoUrl; lastUpdatedAt. |
| POST | `/api/runs/:runId/iterations/:iterationId/review/decide` | Body: `{ decision: "approved" \| "skipped", notes?: string }`. Persist decision; if approved resume that iteration at next node; if skipped mark iteration skipped. |
| GET | `/api/runs/:runId/iterations/:iterationId/editing` | Iteration editing payload: iterationId, title, draftVideoUrl, edlJson/edlUrl, clips[], voiceoverUrl, captionsSrtUrl?, music settings. |
| POST | `/api/runs/:runId/iterations/:iterationId/editing/edl` | Body: `{ edlJson }`. Validate (Zod), save/upload EDL, set edited=true; optionally trigger re-render draft for that iteration. |
| POST | `/api/runs/:runId/iterations/:iterationId/regenerate-draft` | Re-queue Auto Edit for that iteration only; reset review decision to pending. |
| POST | `/api/runs/:runId/iterations/:iterationId/rerender-draft` | (Optional) Apply edited EDL and re-render draft for that iteration. |

##### D) Frontend — Review node UI

- **Node card (canvas):** Badges from review-queue: Needs Review: X, Approved: Y, Skipped: Z, Rendered: W, Failed: F.
- **Node panel “Review Queue”:** On node click, open side panel or modal.
  - **Header:** Run name, total items, progress (approved/rendered counts), search.
  - **Tabs/filters:** All, Needs Review, Edited, Approved, Rendered, Skipped, Failed.
  - **List:** One row per iteration — thumbnail, title, duration, status pill, actions: Preview, Edit, Approve, Skip, Regenerate. Optimistic updates for Approve/Skip; per-row loading spinners; optional keyboard nav.
- **Edit:** Opens editor for that iteration (e.g. `/editor?runId=...&iterationId=...` or modal). Load payload from editing API; on save call save-EDL endpoint; return to Review Queue with row updated (Edited). Only navigation + API wiring; reuse existing editor UI.

##### E) Resuming iteration execution after approval

- Approving one iteration must continue the workflow **only for that iteration** from the node after Review (e.g. Render Final).
- Store a “resume pointer” per iteration (e.g. nextNodeId in DB); on approve, enqueue execution from nextNodeId for that iterationId; downstream outputs attach to same iterationId.

##### F) Tests

1. Iteration enters waiting_for_review when Review decision is pending.
2. Approve resumes only that iteration downstream.
3. Skip marks iteration skipped and does not run Render Final for it.
4. Regenerate resets decision to pending and re-runs auto edit for that iteration.
5. review-queue endpoint returns correct counts and URLs.

##### G) Deliverables

- Review/Approve node acts as per-iteration gate (pending/approved/skipped).
- Backend: review decision storage, review-queue and decide/editing/regenerate-draft (and optional rerender-draft) endpoints.
- Frontend: Review Queue panel with list, tabs, per-row actions (Preview, Edit, Approve, Skip, Regenerate).
- Approval resumes only the selected iteration.
- Edit opens editor for that iteration and saves EDL via API.

**Implementation order:** ~~(1) Backend review decision storage + resume logic~~ ✅; ~~(2) review-queue endpoint~~ ✅; ~~(3) Frontend Review Queue UI~~ ✅; ~~(4) per-row actions (approve/skip/regenerate/edit)~~ ✅; ~~(5) tests~~ ✅. Optional follow-ups: Auto Edit/Review display from iterationSteps (done); EDL save-on-close (done).

---

### Phase 7c — Ideas & Scripts Editor (Notion-like) + Ideas Source (In-app Editor)

**Goal:** Build an in-app Notion-style editor for video ideas and scripts, with a real link to the workflow: the Ideas Source node can read a selected document and output items (split by headings or divider). Do not copy Notion branding; replicate interaction patterns and cleanliness.

**Status:** Planning only (no implementation yet).

---

#### 7c.1 Editor UX (Notion-like)

**Page and layout**

- **Route/page:** “Ideas & Scripts” at `/editor`.
- **Layout:** Clean minimal; centered content column (max width ~760px).
- **Left sidebar (collapsible):** “All Docs”, “Ideas & Scripts” (current), “Templates”, “Trash”.
- **Top bar:** Editable document title; “Saved” indicator (auto-save); **Dashboard** link (back to main app); optional Export / Share (stubbed). — *Done: Dashboard button with icon in header.*

**Editor behavior**

- **Block-based editing:** Each paragraph is a block.
- **Slash command:** “/” opens command menu:
  - /heading1, /heading2, /heading3
  - /bulleted list, /numbered list
  - /divider, /quote, /callout, /code, /toggle (collapsible)
- **Enter** creates a new block; **Backspace** on empty block merges with previous.
- **Drag handle** on left of block to reorder (dnd-kit).
- **Hover:** Block controls (drag handle + “+” insert).
- **Selection + formatting toolbar:** Bold, italic, underline, strike, link, inline code.
- **Paste:** Preserve line breaks and convert into blocks.

**Style**

- Dark mode (default); very subtle borders, soft shadows, rounded corners.
- Typography: clear, readable, Notion-like spacing.
- Animations: subtle (e.g. Framer Motion), no heavy transitions.

---

#### 7c.2 Content model (ideas linked to workflow)

Inside the document, each **video idea** is a “section” with a consistent structure:

- **Heading (H2)** = Idea title.
- Short **“Idea”** paragraph (1–2 lines).
- **“Script”** block (multi-paragraph).
- Optional **metadata callout** (Language, Style, Duration, Hashtags).

Example:

```text
## Why Tunisia is underrated
Idea: 20–30 sec documentary reel about hidden coastal towns.
Script:
[paragraphs...]
Meta: lang=ar, style=documentary, duration=30
```

Two ways to mark/split ideas:

- **A) Split by headings (H2 sections).**
- **B) Split by divider (---).**

---

#### 7c.3 Ideas Source (In-app Editor) integration

**Workflow node: ideas.source — provider “In-app Editor”**

- **Node UI:**
  - Select a document from the Ideas & Scripts editor (dropdown).
  - Choose split mode: **by headings (H2)** or **by divider (---)**.
  - Output preview: first 3 items.

**Implementation**

- Store editor content as **JSON (blocks array)** in DB (per document, per user).
- Ideas Source node reads the selected document’s JSON and converts blocks to `items[]` using the chosen split mode.

**Node output**

```json
{
  "items": [
    {
      "id": "string",
      "title": "string",
      "ideaText": "string",
      "scriptText": "string",
      "rawBlocks": [],
      "meta": {}
    }
  ]
}
```

---

#### 7c.4 Editor features (MVP vs phase 2)

**MVP must include**

- Headings (H1/H2/H3), paragraphs.
- Bulleted + numbered lists, divider, callout (for meta).
- Drag to reorder blocks.
- Autosave (debounced 500 ms) with “Saved” / “Saving…” indicator.
- Search within doc (Cmd/Ctrl+F can be basic).
- Mobile-responsive layout.

**Nice-to-have (phase 2)**

- Toggle blocks, inline comments, templates, multi-doc support (see §7c.8).

---

#### 7c.5 Tech stack recommendation

Use a battle-tested editor framework (do not build from scratch). **Recommended:** **TipTap (ProseMirror)**. Alternatives: Lexical (Meta), Slate. Implement custom theme and block UI to look Notion-like. TypeScript + Zod throughout.

---

#### 7c.6 Deliverables

- New route/page: `/editor` (Ideas & Scripts).
- Sidebar + doc list UI (docs can be stubbed with local storage initially; DB later).
- Editor component with block rendering + slash commands (TipTap or chosen framework).
- Storage layer for document JSON (local-first or DB when ready).
- Ideas Source workflow node: provider “In-app Editor”; select doc, split mode (headings / divider), output preview; backend reads doc JSON and outputs `items[]`.
- Unit tests: split-by-heading and split-by-divider parsing from blocks JSON.

**Implementation order:** TipTap (or Lexical) editor first; then storage (local then DB); then Ideas Source node wiring and parsing. Keep code modular and typed (TypeScript + Zod).

---

#### 7c.7 Option B: Idea docs CRUD via backend (database storage)

**Goal:** Store Ideas & Scripts documents in the database and expose full CRUD via a dedicated API. The editor and the Ideas Source (In-app Editor) node use this API instead of (or in addition to) localStorage.

**Status:** Planning only (no implementation yet).

**Data model (Prisma)**

- **IdeaDoc** (or `IdeaDocument`): `id` (cuid), `userId`, `title` (String), `content` (Json — TipTap doc), `createdAt`, `updatedAt`. Optional: `deletedAt` (DateTime?) for soft delete (Trash).
- Relation: `User` has many `IdeaDoc`; `IdeaDoc` belongs to `User`.
- Migration: add table; ensure indexes on `userId` and optionally `(userId, deletedAt)` for list queries.

**API routes**

| Method | Route | Description |
|--------|--------|-------------|
| GET | `/api/idea-docs` | List user’s docs (exclude soft-deleted unless `?trash=1`). Return `[{ id, title, createdAt, updatedAt }]`. Sort by `updatedAt` desc. |
| POST | `/api/idea-docs` | Create doc. Body: `{ title?: string }`. Default title "Untitled". Content = default empty TipTap doc. Return full doc. |
| GET | `/api/idea-docs/:id` | Get one doc (title + content). 404 if not found or not owned. |
| PUT | `/api/idea-docs/:id` | Update. Body: `{ title?: string, content?: object }`. Validate content (Zod). Return updated doc. |
| DELETE | `/api/idea-docs/:id` | Soft delete (set `deletedAt`). Optional `?permanent=1` or separate endpoint for hard delete / empty Trash. |

All routes require authentication; scope by `req.user.userId`.

**Frontend changes**

- **Editor page:** Replace localStorage read/write with API: load list from `GET /api/idea-docs`; on doc select, `GET /api/idea-docs/:id` and set editor content; autosave and title save → `PUT /api/idea-docs/:id`. Create new doc → `POST /api/idea-docs`, then set as current and load. Delete → `DELETE /api/idea-docs/:id`; if current doc deleted, clear editor or switch to another doc.
- **Sidebar:** "All Docs" shows list from API; "Trash" shows list with `?trash=1`; Restore = clear `deletedAt` (PATCH or PUT); Delete permanently = hard delete.
- **Optional:** Keep a localStorage fallback or one-time migration (import existing single doc into first API-created doc) for users who had data only in localStorage.

**Ideas Source node (In-app Editor) with Option B**

- **Node config:** Add field `ideaDocId` (optional). When provider is `in_app_editor`, document dropdown is populated from `GET /api/idea-docs`; user selects a doc (store `ideaDocId`).
- **Run workflow:** When the node has `ideaDocId`, backend fetches doc by id (from DB) for the current user, then runs existing split logic (by headings or divider). No need for frontend to send full `ideaDoc` in execute body when `ideaDocId` is set.
- **Backward compatibility:** If execute body still includes `ideaDoc` (e.g. client without doc selector or legacy), backend uses it when present; otherwise when `ideaDocId` is set, fetch doc from DB.

**Implementation order (Option B)**

1. Prisma schema + migration for IdeaDoc.
2. API routes: list, create, get by id, update, delete (soft + optional hard).
3. Frontend: API client for idea-docs; editor page switch from localStorage to API (create, list, open, autosave, delete, Trash UI).
4. Ideas Source node: add `ideaDocId` to config and dropdown; backend execution path that loads doc by id when `ideaDocId` is set; keep existing `ideaDoc` body support for backward compatibility.
5. Tests: API unit/integration tests; optional e2e for create → edit → list → delete.

---

#### 7c.8 Multi-doc support for Ideas Source (In-app Editor)

**Goal:** Allow one Ideas Source node (provider = In-app Editor) to pull ideas from **multiple documents** in the Ideas & Scripts editor, so a single workflow run can iterate over “Paris”, “Italy”, etc. without forcing the user to merge everything into one doc.

**Behaviour (MVP)**

- **Modes:**
  - **Single document (default):** current behaviour — user selects **one** document; Ideas Source splits that doc into items (by H2 / divider).
  - **Multiple documents:** user selects **multiple** docs; Ideas Source returns **one item per document**.
- **Multi-doc item shape:**
  - `title`: document title (e.g. “Paris”).
  - `ideaText`: short summary/idea extracted from the document (see extraction rules).
  - `scriptText`: full script text extracted from the document.
  - `rawBlocks`: original TipTap block array for that doc (optional).
  - `meta`: at least `{ docId, docTitle }`.
- **Extraction rules (per document):**
  - If the doc follows the H2/Idea/Script structure from §7c.2:
    - First H2 (or first non-empty line) → `title`.
    - First “Idea:” style paragraph (or first short paragraph) → `ideaText`.
    - Remaining paragraphs → `scriptText`.
  - If the doc is a single short script:
    - `title` = document title.
    - `ideaText` = first sentence or first ~140 characters.
    - `scriptText` = full text.
  - If parsing fails: `title = doc.title`, `ideaText = ""`, `scriptText = full plain-text content`.

**Node UI (Ideas Source, provider = In-app Editor)**

- Add a **“Document mode”** field:
  - Options: **Single document** (default), **Multiple documents**.
- **When Single document:**
  - Keep current **Document** dropdown (single select).
- **When Multiple documents:**
  - Show a **multi-select list** of docs (checkbox list or multi-select dropdown) using `/api/idea-docs`:
    - Each row: title + updated time.
  - Helpers:
    - “Select all docs” (optional).
  - Validation: at least one doc must be selected to run; otherwise show a clear error in node config / logs.

**Execution model**

- Request body does not need to change; Ideas Source loads docs by id for the current user.
- Backend for provider `in_app_editor`:
  - `mode === "single"`: existing path — load one `ideaDocId`, split into items by headings/divider.
  - `mode === "multi"`:
    - Load each selected `ideaDocId` (excluding trashed docs).
    - For each doc, compute a single `IdeaItem` using the extraction rules.
    - Return `items: IdeaItem[]` (one per doc), where `IdeaItem` extends the existing Ideas List item shape with `ideaText`, `scriptText`, and `meta.docId`.
- **For Each + Write Script + Voice:**
  - Flow: Ideas Source (multi-doc) → For Each → Write Script → Voice → …  
  - For Each iterates per document; Write Script uses `$item.title`, `$item.ideaText`, `$item.scriptText` as today; Voice speaks the script from Write Script or `$item.scriptText`.

**Out of scope for this MVP**

- Flattening **all** ideas from **all** docs (multi-doc + multi-idea per doc) — that can be a later enhancement.
- Filtering docs by folder/tags; first version is simple manual multi-select.

---

### Phase 8 — Advanced Features

- Workflow versioning and rollback.
- Team collaboration and shared workspaces.
- Analytics dashboard for content performance.
- Marketplace for community node plugins.

---

## 11. Mobile Responsiveness

**Status:** Implemented (February 2026). App-wide mobile-responsive layout and controls.

**Goal:** Make the whole app usable on phones and tablets: touch-friendly targets, no horizontal overflow, key flows (dashboard, builder, editor, auth, settings) work on viewports &lt;768px.

### Investigation summary (what was done)

| Area | Before | After |
|------|--------|--------|
| **Viewport** | `index.html` already had `width=device-width, initial-scale=1` | No change. |
| **Breakpoint** | `useIsMobile()` at 768px used in Editor and Sidebar | Reused across Builder, TopBar, Inspector, NodeLibrary. |
| **Dashboard** | Responsive grid and `sm:` for header; fixed `px-6` | Responsive padding `px-4 sm:px-6`; header/main consistent. |
| **Login / Register** | Split layout with `lg:hidden` branding on small screens | Already good; optional `p-4 sm:p-6` for form area. |
| **Settings** | `max-w-4xl`, `sm:grid-cols-2` in add-key form | Responsive header/main padding. |
| **Voice Profiles** | Grid and dropdown already responsive | Responsive header/main padding; file input + button wrap. |
| **Builder** | Fixed sidebars: NodeLibrary 260px, Inspector 340px; TopBar dense | **NodeLibrary:** Sheet (left) on mobile when toggled. **InspectorPanel:** Sheet (right) on mobile when node selected or logs present. **TopBar:** Icon-only Run on small screens; responsive padding; workflow name truncation. |
| **FlowCanvas** | ReactFlow with Controls + MiniMap | No layout change; canvas gets full flex area when panels are sheets. |
| **EDL Editor** | Already mobile-first: bottom sheets, tool bar, 9:16 preview | **EditorTopBar:** Export button icon-only on very small screens. Timeline and ToolBar already scroll/touch-friendly. |
| **Command palette** | Dialog-based | Full-screen dialog on small viewports (DialogContent responsive). |
| **Dialogs / Sheets** | shadcn Dialog and Sheet | Left/right sheets use `w-3/4 sm:max-w-sm`; dialogs scroll when content overflows. |

### Tasks completed

| # | Task | Status |
|---|------|--------|
| 11.1 | Dashboard, Settings, VoiceProfiles: responsive container padding (`px-4 sm:px-6`) | Done |
| 11.2 | Builder: On mobile (&lt;768px), NodeLibrary opens in Sheet (left) instead of fixed sidebar | Done |
| 11.3 | Builder: On mobile, InspectorPanel opens in Sheet (right) when node selected or run log present | Done |
| 11.4 | TopBar: Responsive padding; Run button icon-only on small screens; workflow name truncation | Done |
| 11.5 | EditorTopBar: Export button icon-only on very small screens (optional) | Done |
| 11.6 | Ensure all Dialog/Sheet content scrolls on small height (overflow-y-auto) | Verified (shadcn defaults) |

### Optional items (implemented)

| Priority | Item | Status |
|----------|------|--------|
| 1 | **Touch-friendly hit areas** | Done: min 44px touch targets on Builder TopBar, EditorTopBar, EDL ToolBar, Dashboard/Settings/VoiceProfiles headers and primary actions, NodeLibrary rows; workflow card menu trigger visible and 44px on mobile. |
| 2 | **ReactFlow on mobile** | Done: MiniMap hidden on viewports &lt;768px; Controls moved to bottom-left on mobile for thumb reach, bottom-right on desktop. |
| 3 | **Toaster position** | Done: ResponsiveToaster uses bottom-center on mobile and bottom-right on desktop. |

### Builder & Inspector UX refinements (implemented)

| # | Item | Status |
|---|------|--------|
| 11.7 | **Mobile Inspector:** Sheet only opens when a node is selected (not when only run log exists), so the canvas is not hidden on workflow entry; sheet re-opens when tapping a node after closing. | Done |
| 11.8 | **Node list closed by default:** `libraryOpen` initial state set to `false` so the node library does not open automatically when entering the builder. | Done |
| 11.9 | **Clear-search X outside search bar:** Node library search has a dedicated clear button (X) to the right of the input, outside the search bar; shows only when search has text. | Done |
| 11.10 | **Single close in log/Inspector window:** On mobile, Inspector sheet uses `hideCloseButton` on SheetContent so only one close (X) appears in the panel header, not two overlapping. | Done |
| 11.11 | **Mobile node list: close-panel X outside search bar:** Node list Sheet uses `hideCloseButton`; NodeLibraryContent accepts `onClose` and renders a header row (“Nodes” + close X) above the search bar so the close-panel control is clearly outside the search area. | Done |

---

## 8. Data Model

### Core Entities (Prisma Schema)

```prisma
model User {
  id            String     @id @default(cuid())
  email         String     @unique
  passwordHash  String
  name          String?
  role          Role       @default(USER)
  workflows     Workflow[]
  apiKeys       ApiKey[]
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
}

enum Role {
  USER
  ADMIN
}

model Workflow {
  id          String            @id @default(cuid())
  name        String
  description String?
  status      WorkflowStatus    @default(DRAFT)
  nodes       Json              // React Flow nodes array
  edges       Json              // React Flow edges array
  userId      String
  user        User              @relation(fields: [userId], references: [id])
  executions  WorkflowExecution[]
  runs        Run[]             // batch runs (Phase 7b.0)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt
}

enum WorkflowStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

model WorkflowExecution {
  id          String          @id @default(cuid())
  workflowId  String
  workflow    Workflow         @relation(fields: [workflowId], references: [id])
  status      ExecutionStatus @default(RUNNING)
  logs        Json            // Array of per-node execution logs
  startedAt   DateTime        @default(now())
  completedAt DateTime?
  error       String?
}

enum ExecutionStatus {
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}

// ---- Batch runs (Phase 7b.0): one run processes N items via iterations ----

model Run {
  id              String    @id @default(cuid())
  workflowId      String
  workflow        Workflow  @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  status          RunStatus @default(QUEUED)
  createdAt       DateTime  @default(now())
  startedAt       DateTime?
  finishedAt      DateTime?
  totalItems      Int       @default(0)
  completedItems  Int       @default(0)
  failedItems     Int       @default(0)
  waitingItems    Int       @default(0)
  skippedItems    Int       @default(0)
  workflowSnapshotJson Json?  // optional config snapshot / workflow version
  iterations      RunIteration[]
  steps           RunStep[]
  artifacts       RunArtifact[]
  reviewDecisions RunReviewDecision[]
}

enum RunStatus {
  QUEUED
  RUNNING
  PAUSED
  COMPLETED
  FAILED
  CANCELED
}

model RunIteration {
  id          String        @id @default(uuid())
  runId       String
  run         Run           @relation(fields: [runId], references: [id], onDelete: Cascade)
  itemIndex   Int
  itemId      String
  title       String
  payloadJson Json          // full item: { id, title, idea, script?, meta? }
  status      IterationStatus @default(QUEUED)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  steps       RunStep[]
  artifacts   RunArtifact[]
  reviewDecisions RunReviewDecision[]

  @@index([runId])
}

enum IterationStatus {
  QUEUED
  RUNNING
  WAITING
  SUCCEEDED
  FAILED
  SKIPPED
}

model RunStep {
  id           String    @id @default(uuid())
  runId        String
  run          Run       @relation(fields: [runId], references: [id], onDelete: Cascade)
  iterationId  String?   // null = step outside loop
  iteration    RunIteration? @relation(fields: [iterationId], references: [id], onDelete: SetNull)
  nodeId       String
  nodeType     String
  status       StepStatus @default(QUEUED)
  attempt      Int       @default(1)
  startedAt    DateTime?
  finishedAt   DateTime?
  inputsJson   Json?
  outputsJson  Json?
  errorJson    Json?

  @@index([runId])
  @@index([iterationId])
}

enum StepStatus {
  QUEUED
  RUNNING
  SUCCEEDED
  FAILED
  WAITING
  SKIPPED
}

model RunArtifact {
  id           String    @id @default(uuid())
  runId        String
  run          Run       @relation(fields: [runId], references: [id], onDelete: Cascade)
  iterationId  String?   // null = artifact outside loop
  iteration    RunIteration? @relation(fields: [iterationId], references: [id], onDelete: SetNull)
  type         String    // audio | draft_video | final_video | edl | subtitle | image | other
  url          String
  metaJson     Json?
  createdAt    DateTime  @default(now())

  @@index([runId])
  @@index([iterationId])
}

// Phase 7b.7 — Review node per-iteration decisions
model RunReviewDecision {
  id          String   @id @default(uuid())
  runId       String
  run         Run      @relation(fields: [runId], references: [id], onDelete: Cascade)
  iterationId String
  iteration   RunIteration @relation(fields: [iterationId], references: [id], onDelete: Cascade)
  nodeId      String
  decision    String   // pending | approved | skipped
  notes       String?
  edited      Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  decidedAt   DateTime?

  @@unique([runId, iterationId, nodeId])
  @@index([runId])
  @@index([iterationId])
}

model ApiKey {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  service     String   // e.g. "openai", "elevenlabs", "meta", "tiktok"
  encryptedKey String
  label       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Phase 7 entities (video edit pipeline)

```prisma
model VideoProject {
  id              String    @id @default(cuid())
  userId          String
  runId           String?   // workflow execution id
  draftVideoUrl   String?
  edlUrl          String
  approvedEdlUrl  String?
  status          String   // e.g. draft, approved, rendered
  createdAt       DateTime @default(now())
  user            User     @relation(fields: [userId], references: [id])
}

model ReviewSession {
  id         String    @id @default(cuid())
  runId      String
  stepId     String
  projectId  String?
  status     String    // pending | resolved | expired
  expiresAt  DateTime?
  createdAt  DateTime  @default(now())
  resolvedAt DateTime?
}
```

### Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌─────────────────────┐
│   User   │──1:N──│   Workflow    │──1:N──│ WorkflowExecution   │
│          │       │              │       │                     │
│ id       │       │ id           │       │ id                  │
│ email    │       │ name         │       │ status              │
│ password │       │ status       │       │ logs (JSON)         │
│ role     │       │ nodes (JSON) │       │ startedAt           │
└────┬─────┘       │ edges (JSON) │       │ completedAt         │
     │             └──────┬───────┘       └─────────────────────┘
     │                    │
     │                    │ 1:N (Phase 7b.0)
     │                    ▼
     │             ┌──────────────┐       ┌─────────────────────┐
     │             │     Run      │──1:N──│   RunIteration      │
     │             │ (batch run)  │       │   RunStep           │
     │             │ status, etc. │       │   RunArtifact       │
     │             │              │       │   RunReviewDecision │
     │             └──────────────┘       └─────────────────────┘
     │
     │1:N
     ▼
┌──────────┐
│  ApiKey   │     Phase 7: VideoProject (edlUrl, draftVideoUrl), ReviewSession (runId, stepId, status, expiresAt)
│ service  │
│ encrypted│
└──────────┘
```

---

## 9. API Routes

### Authentication

| Method | Route                  | Description           | Auth     |
|--------|------------------------|-----------------------|----------|
| POST   | `/api/auth/register`   | Register new user     | Public   |
| POST   | `/api/auth/login`      | Login, returns JWT    | Public   |
| GET    | `/api/auth/me`         | Get current user      | Required |

### Workflows

| Method | Route                              | Description             | Auth     |
|--------|------------------------------------|-------------------------|----------|
| GET    | `/api/workflows`                   | List user's workflows   | Required |
| POST   | `/api/workflows`                   | Create new workflow     | Required |
| GET    | `/api/workflows/:id`               | Get workflow by ID      | Required |
| PUT    | `/api/workflows/:id`               | Update workflow         | Required |
| DELETE | `/api/workflows/:id`               | Delete workflow         | Required |
| POST   | `/api/workflows/:id/duplicate`     | Duplicate a workflow    | Required |
| POST   | `/api/workflows/:id/execute`       | Execute a workflow      | Required |
| GET    | `/api/workflows/:id/executions`    | Get execution history   | Required |
| POST   | `/api/workflows/:id/executions/:execId/steps/:stepId/resolve-review` | Resolve approval gate (approve or edit EDL); body: `{ action, approvedEdl? }` | Required |

### Runs / Iterations / Steps (Phase 7b.0 — Batch runs)

| Method | Route | Description | Auth |
|--------|--------|-------------|------|
| GET    | `/api/runs/:runId` | Run summary + counters | Required |
| GET    | `/api/runs/:runId/iterations` | List iterations (status, title, itemIndex) | Required |
| GET    | `/api/runs/:runId/iterations/:iterationId` | Iteration payload + all run_steps for that iteration + artifacts | Required |
| GET    | `/api/runs/:runId/steps` | List steps (optional query: iterationId, nodeId, status) | Required |
| POST   | `/api/runs/:runId/cancel` | Cancel the run | Required |
| POST   | `/api/runs/:runId/pause` | Pause the run (MVP may be coarse) | Required |
| POST   | `/api/runs/:runId/resume` | Resume a paused run | Required |

### Review Queue / per-iteration actions (Phase 7b.7)

| Method | Route | Description | Auth |
|--------|--------|-------------|------|
| GET    | `/api/runs/:runId/review-queue` | List iterations for Review: iterationId, itemIndex, title; statuses; draftVideoUrl, voiceoverUrl?, finalVideoUrl; lastUpdatedAt. | Required |
| POST   | `/api/runs/:runId/iterations/:iterationId/review/decide` | Body: `{ decision: "approved" \| "skipped", notes?: string }`. Persist decision; if approved resume that iteration at next node; if skipped mark iteration skipped. | Required |
| GET    | `/api/runs/:runId/iterations/:iterationId/editing` | Iteration editing payload (title, draftVideoUrl, edlJson/edlUrl, clips[], voiceoverUrl, captionsSrtUrl?, music). | Required |
| POST   | `/api/runs/:runId/iterations/:iterationId/editing/edl` | Body: `{ edlJson }`. Validate (Zod), save/upload EDL, set edited=true; optionally trigger re-render draft. | Required |
| POST   | `/api/runs/:runId/iterations/:iterationId/regenerate-draft` | Re-queue Auto Edit for that iteration only; reset review decision to pending. | Required |
| POST   | `/api/runs/:runId/iterations/:iterationId/rerender-draft` | (Optional) Apply edited EDL and re-render draft for that iteration. | Required |

### Settings

| Method | Route                  | Description             | Auth     |
|--------|------------------------|-------------------------|----------|
| GET    | `/api/settings/keys`   | List user's API keys    | Required |
| POST   | `/api/settings/keys`   | Store a new API key     | Required |
| DELETE | `/api/settings/keys/:id` | Delete an API key     | Required |

### Storage (Phase 6b)

| Method | Route                     | Description                              | Auth     |
|--------|----------------------------|------------------------------------------|----------|
| GET    | `/api/storage/play?key=...` | Return play URL: if `CLOUDFRONT_DOMAIN` is set, CloudFront URL (Option A); else presigned S3 URL. Key must be `voice-output/{userId}/...` or `video-assets/{userId}/...`. | Required |

**Later (backlog):** Implement **Option B — CloudFront signed URLs** for private, time-limited play URLs. Requires CloudFront key pair and signing in backend (`CLOUDFRONT_KEY_PAIR_ID`, `CLOUDFRONT_PRIVATE_KEY`); distribution must require signed requests. Provides expiry and better security than Option A (un signed CloudFront URLs).

### Projects / EDL (Phase 7a)

| Method | Route | Description | Auth |
|--------|--------|-------------|------|
| GET    | `/api/projects/:projectId` | Get project detail (draftVideoUrl, edlUrl, status); used for polling after render-draft. | Required |
| GET    | `/api/projects/:projectId/edl` | Get EDL JSON for project (from S3). User must own project. | Required |
| POST   | `/api/projects/:projectId/edl/update` | Validate EDL body (Zod), store to S3, update project ref. | Required |
| POST   | `/api/projects/:projectId/render-draft` | Enqueue async draft re-render (or run in-process); update draftVideoUrl when done. | Required |

### System

| Method | Route              | Description        | Auth     |
|--------|--------------------|--------------------|----------|
| GET    | `/api/health`      | Health check       | Public   |

---

## 10. Risk Register

| Risk                                      | Impact | Likelihood | Mitigation                                    |
|-------------------------------------------|--------|------------|-----------------------------------------------|
| Vercel serverless timeout on long workflows | High  | Medium     | Keep MVP execution simple; plan migration path |
| Neon cold start latency                    | Medium | Low        | Use connection pooling; Neon auto-scales       |
| External API rate limits (OpenAI, TTS)     | Medium | Medium     | Implement retry with backoff; show clear errors|
| Social media API policy changes            | High   | Medium     | Abstract publishing behind adapter pattern     |
| Scope creep beyond MVP                     | High   | High       | Strict phase gates; defer non-essentials       |
| API key security breach                    | High   | Low        | Encrypt at rest; never expose in frontend      |
