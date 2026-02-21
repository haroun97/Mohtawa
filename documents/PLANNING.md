# Project Planning Document

## Mohtawa — AI Content Automation Workflow Platform

**Date:** February 20, 2026
**Methodology:** Iterative (phase-based MVP approach)
**Last updated:** Phase 7a EDL Editor Phase 1 UI/UX rework (Instagram Edits–style) implemented; planning doc updated.

---

## Table of Contents

1. [Project Phases Overview](#1-project-phases-overview)
2. [Phase 1 — Foundation](#2-phase-1--foundation)
3. [Phase 2 — Workflow Builder](#3-phase-2--workflow-builder)
4. [Phase 3 — Workflow Persistence & Execution](#4-phase-3--workflow-persistence--execution)
5. [Phase 4 — AI & External Integrations](#5-phase-4--ai--external-integrations)
6. [Phase 5 — Polish & Deploy MVP](#6-phase-5--polish--deploy-mvp)
7. [Post-MVP Phases](#7-post-mvp-phases) (includes Phase 6b — Voice cloning; Phase 7 — Video edit pipeline; Phase 7a — Instagram-style EDL Editor)
8. [Data Model](#8-data-model)
9. [API Routes](#9-api-routes)
10. [Risk Register](#10-risk-register)

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
- **Preview** (`PreviewPlayer.tsx`): Vertical 9:16 video; live CSS filter for color (saturation/contrast/vibrance); ref for Space play/pause.
- **Timeline** (`TimelineTrack.tsx`): Thumbnail-style track — clip blocks with label + duration; drag-to-reorder (HTML5 DnD); playhead scrubber; selection by `selectedClipId` (outline/ring). Trim is in **Trim** tool sheet when a clip is selected.
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
| 2 | **Real clip thumbnails in timeline** | Timeline currently shows label + duration per clip; add tiny thumbnail frame per clip (e.g. video frame at `inSec` or placeholder) for Instagram-like look. May require backend thumbnail endpoint or client-side video decode. |
| 3 | **Split clip (UI + backend)** | Add “Split” to tool bar; when backend supports split (new clip + updated inSec/outSec), show Split in editor; otherwise keep hidden. |
| 4 | **Overlay editing in editor** | Add/remove text overlays; edit overlay text, startSec, endSec (currently only style preset in Captions sheet; full overlay edit is JSON-only). |
| 5 | **Desktop: optional right panel for tools** | On desktop, consider showing active tool controls in a right-side panel instead of (or in addition to) bottom sheet for faster access. |
| 6 | **Delete selected clip** | If backend supports removing a clip from EDL (reflow startSec), add Delete to tool bar and Del keyboard shortcut. |

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

### Phase 8 — Advanced Features

- Workflow versioning and rollback.
- Team collaboration and shared workspaces.
- Analytics dashboard for content performance.
- Marketplace for community node plugins.

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

### Settings

| Method | Route                  | Description             | Auth     |
|--------|------------------------|-------------------------|----------|
| GET    | `/api/settings/keys`   | List user's API keys    | Required |
| POST   | `/api/settings/keys`   | Store a new API key     | Required |
| DELETE | `/api/settings/keys/:id` | Delete an API key     | Required |

### Storage (Phase 6b)

| Method | Route                     | Description                              | Auth     |
|--------|----------------------------|------------------------------------------|----------|
| GET    | `/api/storage/play?key=...` | Return presigned S3 URL for playback (e.g. TTS audio). Key must be `voice-output/{userId}/...`. | Required |

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
