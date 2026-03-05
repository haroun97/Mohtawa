# Software Requirements Specification (SRS)

## AI Content Automation Workflow Platform

**Version:** 1.5
**Date:** March 5, 2026
**Status:** Approved

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Product Overview](#2-product-overview)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Deployment Strategy](#6-deployment-strategy)
7. [Future Enhancements](#7-future-enhancements)

---

## 1. Introduction

This document defines the functional and non-functional requirements for a visual workflow automation platform designed to automate AI-driven content creation, including script generation, voice synthesis, video rendering, and automated social media publishing.

---

## 2. Product Overview

The platform enables users to create drag-and-drop workflows similar to n8n or Make. Users can visually connect nodes (cards) representing triggers, AI actions, voice synthesis, video generation, and social publishing. The system executes workflows and manages logs, retries, and scheduling.

---

## 3. Functional Requirements

### 3.1 User Authentication and Authorization

- User signup and login (email/password, OAuth providers).
- Role-based access control (admin, editor, viewer).
- Session management and token-based authentication (JWT).

### 3.2 Dashboard

- Create, edit, delete, and duplicate workflows.
- Overview of workflow status (active, draft, failed).
- Search and filter workflows.

### 3.3 Visual Drag-and-Drop Workflow Builder

- Node-based interface using React Flow.
- Connect nodes via edges to define execution order.
- Zoom, pan, and minimap navigation.
- Command palette for quick node insertion.
- Inspector panel for node configuration.

### 3.4 Node Library

Nodes are categorized into the following groups:

| Category    | Examples                                         |
|-------------|--------------------------------------------------|
| Triggers    | Schedule (cron), Webhook, Manual trigger         |
| AI          | LLM Script Generator, Text Summarizer, Prompter  |
| Voice       | Text-to-Speech (TTS), Voice Cloning              |
| Video       | Template Renderer, FFmpeg Processor, Clip Joiner |
| Social      | YouTube Publisher, TikTok Publisher, Meta/Instagram Publisher |
| Logic       | Conditional Branch, Loop, Delay, Merge, **For Each** |
| Utilities   | HTTP Request, File Storage, Notification, Logger |
| **Ideas**   | **Ideas Source** (Manual, CSV, **In-app Editor**, Notion, Google Docs) |
| **Text**    | **Split into Items** (headings, bullets, separator) |
| **Script**  | **Write Script** (AI draft + manual edit; supports loop context) |
| **Review**  | **Review/Approve** (per-iteration gate: pending/approved/skipped; Review Queue UI for batch runs) |

### 3.5 Ideas List + Loop (Option B)

One workflow can generate many videos from a list of ideas. The user can review or edit the script for each idea before the workflow continues.

#### 3.5.0 Run, Iteration, and Step Model (Batch Runs)

- **Workflow (template):** Stored once as a graph (nodes + edges + configs). Not recreated per idea.
- **Run (batch execution):** A single run can process N items (ideas). Run has status: `queued` | `running` | `paused` | `completed` | `failed` | `canceled`.
- **Iteration:** Each item from the Ideas Source (or upstream) becomes one iteration. An iteration has: `iterationId` (UUID), `runId`, `itemIndex`, `itemId`, `title`, `status`. Iteration status: `queued` | `running` | `waiting` | `succeeded` | `failed` | `skipped`.
- **Node Step (execution unit):** Every node execution is recorded either per iteration (when inside a loop) or per run (when outside the loop). Each step stores: inputs, outputs, status, timestamps, attempt, and error when applicable.

#### 3.5.1 Ideas Source node (`ideas.source`)

- **Providers (MVP order):** Manual list, CSV upload, **In-app Editor**, Notion database/page, Google Docs (later).
- **Output (standard):** `{ items: Array<{ id: string, title: string, idea?: string, script?: string, meta?: object }> }` (Ideas Source node output contract).
- **Output (In-app Editor):** `{ items: Array<{ id, title, ideaText, scriptText, rawBlocks, meta }> }` when reading from an Ideas & Scripts document.
- **Manual mode:** Multiline textarea (one idea per line) or JSON array.
- **CSV mode:** File upload and column selection for idea text.
- **In-app Editor mode:** User selects a document from the Ideas & Scripts editor; split mode: by headings (H2) or by divider (---); node reads document JSON from storage and converts blocks to items; output preview (first 3 items) in node UI.
- **Notion mode:** OAuth or API key; database (with optional Status filter) or page (blocks → raw text for Split node).
- **Google Docs mode:** OAuth; read doc as plain text; splitting via Split node.

#### 3.5.2 Split into Items node (`text.split_items`)

- **Input:** Raw text or blocks from upstream.
- **Config:** `splitMode`: headings (Markdown # or heading lines), bullets (- or •), or separator (---).
- **Output:** `{ items: Array<{ id, title, idea }> }` for consumption by For Each.

#### 3.5.3 For Each node (`flow.for_each`)

- **Input:** `items[]` from Ideas Source or Split node (or an array directly if the engine supports it).
- **Behavior:** Creates one **iteration** per item (persisted as run_iterations). Executes downstream nodes once per item in sequence (MVP; parallel with concurrency limit is a later phase).
- **Context variables per iteration:** `$item` (current item), `$index`, `$total`. Nodes inside the loop must be able to reference `$item.title`, `$item.idea`, `$item.script`; implement a variable interpolation resolver used by all nodes.
- **Per-iteration persistence:** Every node inside the loop records a **run_step** per iteration (run_steps linked to iterationId). Outputs are stored per iteration so downstream nodes receive the correct upstream outputs for the same iteration.
- **Aggregation after loop:** When the loop finishes, the For Each node produces a single aggregated output (stored as the For Each node’s run_step with iterationId = null): `{ results: [{ iterationId, itemId, title, outputsByNodeId: { … }, artifacts: [ … ] }] }`.
- **Failure handling:** Config `onError`: `"continue"` (default) — mark failed iteration, continue with next; `"stop"` — stop the batch. Errors are recorded in run_steps.errorJson.
- **Manual review:** When a downstream node (e.g. Write Script) is in manual mode, the run can pause until the user clicks “Continue”; paused state is stored and resumable.
- **UI:** Progress (e.g. 3/12), sequential/parallel toggle (parallel disabled in MVP), stop/cancel.

#### 3.5.4 Write Script node (`script.write`)

- When placed inside For Each: pre-fill with `title = $item.title`, prompt seed = `$item.idea`.
- **Modes:** (A) AI-generated draft (optional toggle), then editable; (B) Manual script only (user edits and clicks “Continue”).
- **Actions:** Continue, Regenerate (if AI), Skip.
- **Output:** `{ title, idea, script, language?, style?, captions?: boolean }`.
- **UI:** Show current idea title; rich text or textarea (MVP); Generate with AI toggle.

#### 3.5.5 Review/Approve node (batch runs)

The Review/Approve node runs **inside the loop** (per iteration) and acts as a per-iteration decision gate. It does not redesign the whole app; only the Review node panel and related per-iteration actions are in scope.

- **Runtime behavior:** For each iteration, the node produces a **decision**: `"pending"` (needs review), `"approved"`, or `"skipped"`. Default is `"pending"` unless configured to auto-approve.
- **Engine behavior:**
  - If decision is **pending:** mark that iteration as `waiting` (e.g. waiting_for_review); do **not** run downstream nodes (e.g. Render Final) for that iteration; continue processing other iterations when possible.
  - If **approved:** allow downstream nodes to execute for that iteration only; approving one iteration resumes execution **only for that iteration** from the node after Review (e.g. Render Final).
  - If **skipped:** mark iteration as skipped and do not run downstream nodes for that iteration.
- **Configuration:** `mode`: `"manual"` | `"auto_approve"` | `"auto_approve_after_timeout"`; optional `autoApproveAfterSec` when timeout mode is used. **manual** ⇒ pending until user approves/skips; **auto_approve** ⇒ instantly approved; **auto_approve_after_timeout** ⇒ pending, then auto-approve after timeout if no user action. Timeout can be implemented via a delayed job per iteration that checks decision is still pending then approves.
- **Output:** Pass-through of approved EDL (or original/updated draft) for downstream Render Final; decision and metadata are persisted (see §3.6.3).

### 3.6 Workflow Execution Engine

- Sequential and parallel node execution.
- **Execution context:** Every node receives an execution context object: `runId`, `nodeId`, `iterationId?` (null when outside loop), `item?` (current item for this iteration), `index`, `total`, and a variables/outputs map for upstream data. This context is used for variable interpolation and per-iteration output addressing.
- **Loop execution (For Each):** For Each creates run_iterations rows for each input item. Downstream nodes execute once per iteration; each execution is recorded as a run_step with the corresponding iterationId. Pass iteration context (`$item`, `$index`, `$total`); store outputs per iteration in run_steps.outputsJson; aggregate results into `results[]` at loop end (For Each step with iterationId = null).
- **Node output addressing:** Outputs from nodes inside the loop are stored in run_steps with iterationId. The next node in the loop receives upstream outputs for the same iteration only.
- **Manual review gating:** Pause run when a node (e.g. Write Script) requires user action; store paused state; resume via “Continue” (see §3.5.3, §3.5.4).
- **Logging and persistence:** Each node execution is logged as a run_step (inputsJson, outputsJson, status, timestamps, attempt, errorJson). Steps outside the loop have iterationId = null.
- Retry capability with configurable retry count and backoff.
- Error handling with fallback paths; For Each supports configurable onError (continue vs stop batch).
- **Concurrency (future):** Architecture must allow later running iterations in parallel with a concurrency limit; MVP implements sequential execution only.

#### 3.6.1 Run and iteration data persistence

The system shall persist batch run data as follows:

- **runs:** `id`, `workflowId`, `status`, `createdAt`, `startedAt`, `finishedAt`; totals: `totalItems`, `completedItems`, `failedItems`, `waitingItems`, `skippedItems`; optional config snapshot (workflow version or workflowSnapshotJson).
- **run_iterations:** `id` (UUID), `runId`, `itemIndex`, `itemId`, `title`, `payloadJson` (full item: id, title, idea, …), `status`, `createdAt`, `updatedAt`.
- **run_steps:** `id` (UUID), `runId`, `iterationId` (nullable; null = step outside loop), `nodeId`, `nodeType`, `status` (e.g. queued/running/succeeded/failed/waiting/skipped), `attempt`, `startedAt`, `finishedAt`, `inputsJson`, `outputsJson`, `errorJson`.
- **run_artifacts (optional):** `id`, `runId`, `iterationId` (nullable), `type` (e.g. audio, draft_video, final_video, edl, subtitle, image, other), `url`, `metaJson`, `createdAt`.
- **run_review_decisions (recommended for Review node):** `id`, `runId`, `iterationId`, `nodeId`, `decision` (pending | approved | skipped), `notes`, `edited` (boolean), `createdAt`, `updatedAt`, `decidedAt`. Optionally store references to iteration artifacts (draftVideoUrl, edlUrl or edlJson, finalVideoUrl) in this table or resolve from run_steps/run_artifacts.

#### 3.6.2 Run and iteration APIs

The system shall provide API endpoints to support batch run inspection and control (no Review queue or Editor UI required for core architecture):

- **GET** `/api/runs/:runId` — run summary and counters.
- **GET** `/api/runs/:runId/iterations` — list iterations with status, title, itemIndex.
- **GET** `/api/runs/:runId/iterations/:iterationId` — iteration payload, all run_steps for that iteration, and artifacts.
- **GET** `/api/runs/:runId/steps` — list steps (optional filter by iterationId, nodeId, status).
- **POST** `/api/runs/:runId/cancel` — cancel the run.
- **POST** `/api/runs/:runId/pause` — pause the run (MVP may be coarse).
- **POST** `/api/runs/:runId/resume` — resume a paused run.

#### 3.6.3 Review Queue and per-iteration action APIs

The system shall provide API endpoints to power the Review Queue UI and per-iteration actions:

- **GET** `/api/runs/:runId/review-queue` — list iterations for the Review node: iterationId, itemIndex, title; statuses (draft ready, review decision, render status); draftVideoUrl (thumbnail/preview), voiceoverUrl (optional), finalVideoUrl if rendered; lastUpdatedAt.
- **POST** `/api/runs/:runId/iterations/:iterationId/review/decide` — body: `{ decision: "approved" | "skipped", notes?: string }`. Persist decision; if approved, resume that iteration’s execution at the next node after Review only; if skipped, mark iteration skipped.
- **GET** `/api/runs/:runId/iterations/:iterationId/editing` — return iteration editing payload: iterationId, title, draftVideoUrl, edlJson (or edlUrl), clips[], voiceoverUrl, captionsSrtUrl?, music settings.
- **POST** `/api/runs/:runId/iterations/:iterationId/editing/edl` — body: `{ edlJson }`. Validate EDL (Zod); save to DB and/or upload to S3; mark edited=true; optionally trigger re-render draft for that iteration.
- **POST** `/api/runs/:runId/iterations/:iterationId/regenerate-draft` — re-queue Auto Edit for that iteration only; reset review decision to pending.
- **POST** `/api/runs/:runId/iterations/:iterationId/rerender-draft` (optional) — apply edited EDL and re-render draft for that iteration.

**Resuming after approval:** Approving one iteration must continue the workflow **only for that iteration** from the node after Review (e.g. Render Final). Implementation may store a resume pointer (e.g. nextNodeId) per iteration and enqueue execution starting at that node for that iteration when approved; downstream node outputs attach to the same iterationId.

### 3.13 Review Queue UI (Batch Runs)

Scope is limited to the Review/Approve node experience and related per-iteration actions; do not redesign the whole app.

- **Node card (canvas):** When the Review/Approve node is present, show summary badges derived from the review-queue data: Needs Review: X, Approved: Y, Skipped: Z, Rendered: W, Failed: F.
- **Node panel — “Review Queue”:** When the user selects the Review/Approve node, open a side panel (or modal) that shows:
  - **Header:** Run name, total items, progress (e.g. approved/rendered counts), search input.
  - **Tabs/filters:** All, Needs Review, Edited, Approved, Rendered, Skipped, Failed.
  - **List view:** One row per iteration. Each row: thumbnail (draft preview), title (idea), duration if known, status pill (Needs review / Approved / Rendered / Failed), and actions: **Preview** (inline or modal), **Edit**, **Approve**, **Skip**, **Regenerate**.
  - **UX:** Approve/Skip update the row optimistically where feasible; show per-row loading spinners when actions are in progress; optional keyboard navigation.
- **Edit behavior:** “Edit” opens the editor for that iteration (e.g. route `/editor?runId=...&iterationId=...` or an Editor modal). The editor loads the iteration editing payload from the API; on save (EDL), it calls the save-EDL endpoint and returns to the Review Queue with that row updated (e.g. status “Edited”). Only navigation and API wiring to open editor and save EDL are required; the existing editor UI is reused, not redesigned.

### 3.7 Scheduling System

- Cron-based scheduling for time-triggered workflows.
- Recurring and one-time schedule support.
- Timezone-aware scheduling.

### 3.8 AI API Integration

- Integration with LLM providers (OpenAI, Anthropic, etc.) for script and content generation.
- Text-to-Speech (TTS) integration (ElevenLabs, Google Cloud TTS, etc.).
- Configurable API keys per user or workspace.

### 3.9 Video Rendering Engine

- Template-based video rendering using FFmpeg.
- Support for combining audio, images, and text overlays.
- Background rendering via worker queue.
- Output format configuration (resolution, codec, duration).

### 3.10 Social Media Publishing

- Meta (Facebook/Instagram) API integration for automated posting.
- TikTok API integration for video uploads.
- Scheduling posts at optimal times.
- Status tracking for published content.

### 3.11 Workflow Versioning and History

- Version control for workflow definitions.
- Execution history with detailed logs per run.
- Ability to rollback to previous workflow versions.

### 3.12 Ideas & Scripts Editor (Notion-like)

An in-app rich text editor for writing and managing video ideas and scripts, with a direct link to the workflow Ideas Source node. Do not copy Notion branding; replicate interaction patterns and cleanliness.

#### 3.12.1 Page and layout

- **Route:** `/editor` (page title: “Ideas & Scripts”).
- **Layout:** Clean minimal layout; centered content column (max width ~760px).
- **Left sidebar (collapsible):** “All Docs”, “Ideas & Scripts” (current), “Templates”, “Trash”.
- **Top bar:** Editable document title; “Saved” / “Saving…” indicator (auto-save); optional Export / Share (can be stubbed).

#### 3.12.2 Editor UX (Notion-like)

- **Block-based editing:** Each paragraph/section is a block.
- **Slash command:** Typing “/” opens a command menu with: /heading1, /heading2, /heading3, /bulleted list, /numbered list, /divider, /quote, /callout, /code, /toggle (collapsible section).
- **Enter** creates a new block; **Backspace** on empty block merges with previous.
- **Drag handle** on the left of each block to reorder blocks (e.g. dnd-kit).
- **Hover:** Block controls (drag handle + “+” insert).
- **Selection + formatting toolbar:** Bold, italic, underline, strikethrough, link, inline code.
- **Paste:** Preserve line breaks and convert into blocks.
- **Style:** Dark mode default; subtle borders, soft shadows, rounded corners; clear typography and Notion-like spacing; subtle animations (e.g. Framer Motion), no heavy transitions.

#### 3.12.3 Content model (ideas linked to workflow)

Each **video idea** in the document is a “section” with a consistent structure:

- **Heading (H2)** = Idea title.
- Short **“Idea”** paragraph (1–2 lines).
- **“Script”** block (multi-paragraph).
- Optional **metadata callout** (e.g. Language, Style, Duration, Hashtags).

Example: `## Why Tunisia is underrated` → Idea paragraph → Script paragraphs → Meta callout.

Two ways to mark/split ideas in the editor:

- **A) Split by headings (H2 sections).**
- **B) Split by divider (---).**

#### 3.12.4 Storage and Ideas Source integration

- **Storage:** Editor content stored as **JSON (blocks array)**. Implementation may be local-first (localStorage) or **backend/DB (Option B)** as per phase.
- **Ideas Source node (In-app Editor):**
  - **Node UI:** Select a document from the editor (dropdown); choose split mode (by headings H2, or by divider); output preview (first 3 items).
  - **Backend:** Node reads the selected document’s JSON (from execution context when client sends `ideaDoc`, or by **docId** from the API when using Option B) and converts blocks to `items[]` using the chosen split mode.
  - **Output:** `{ items: [{ id, title, ideaText, scriptText, rawBlocks, meta }] }`.

#### 3.12.6 Option B: Idea docs CRUD via backend (database storage)

When editor storage is backend-backed, documents are stored in the database and exposed via a dedicated API. The editor and the Ideas Source node use this API for full CRUD.

**Data model**

- **IdeaDoc (or equivalent) entity:** `id` (cuid), `userId`, `title`, `content` (JSON — TipTap/ProseMirror doc), `createdAt`, `updatedAt`. Optional: `deletedAt` for soft delete (Trash).
- **Ownership:** All operations are scoped by authenticated user (`userId`).

**API (REST)**

| Method | Route | Description | Auth |
|--------|--------|-------------|------|
| GET | `/api/idea-docs` | List user’s idea docs (exclude soft-deleted unless query `?trash=1`). Return `[{ id, title, createdAt, updatedAt }]` (no full content). Optional sort by `updatedAt` desc. | Required |
| POST | `/api/idea-docs` | Create doc. Body: `{ title?: string }`. Default title "Untitled". Return full doc `{ id, title, content, createdAt, updatedAt }`. Content = default empty TipTap doc. | Required |
| GET | `/api/idea-docs/:id` | Get one doc by id (title + content). 404 if not found or not owned by user. | Required |
| PUT | `/api/idea-docs/:id` | Update doc. Body: `{ title?: string, content?: object }`. Validate content shape (e.g. Zod). Return updated doc. | Required |
| DELETE | `/api/idea-docs/:id` | Delete doc. **Soft delete:** set `deletedAt` (and list endpoint excludes by default). **Hard delete:** optional `?permanent=1` or separate "empty Trash" to permanently remove. | Required |

**Editor behaviour (Option B)**

- **Create:** Call `POST /api/idea-docs`, set current doc to response; load title and content in editor.
- **Read / list:** "All Docs" calls `GET /api/idea-docs`, shows list; click doc → `GET /api/idea-docs/:id`, set current doc, load in editor.
- **Edit:** Autosave (debounced) and title change call `PUT /api/idea-docs/:id` with current doc id.
- **Delete:** "Delete" calls `DELETE /api/idea-docs/:id`. "Trash" view: list with `?trash=1`; "Restore" = clear `deletedAt` (e.g. PATCH or PUT); "Delete permanently" = hard delete.

**Ideas Source node (Option B)**

- **Node UI:** Document dropdown is populated from `GET /api/idea-docs` (id + title). User selects a doc (by id).
- **Run workflow:** When executing a workflow that contains Ideas Source (In-app Editor) with a selected **docId**, backend loads that doc via `GET /api/idea-docs/:id` (or from execution context if frontend sends full doc). No need to send full `ideaDoc` in the execute request body when docId is stored in node config; backend fetches doc by id and runs the same split logic.
- **Backward compatibility:** If execute body still includes `ideaDoc` (e.g. from a client that only has localStorage), backend can continue to accept it and use it when present; otherwise use docId and fetch from DB.

#### 3.12.5 MVP editor features (single-doc or multi-doc)

- **Required for MVP:** Headings (H1/H2/H3), paragraphs, bulleted and numbered lists, divider, callout (for meta), drag-to-reorder blocks, autosave (debounced e.g. 500 ms) with “Saved” / “Saving…” indicator, search within doc (e.g. Cmd/Ctrl+F, basic), mobile-responsive layout.
- **Nice-to-have (phase 2):** Toggle blocks, inline comments, templates, multi-doc support.

#### 3.12.7 Tech stack (editor)

Use a battle-tested editor framework (do not build from scratch). **Recommended:** TipTap (ProseMirror). Alternatives: Lexical (Meta), Slate. Implement custom theme and block UI to look Notion-like.

---

## 4. Non-Functional Requirements

### 4.1 Performance

- High performance execution with asynchronous job queue support.
- Node execution latency < 200ms (excluding external API calls).
- Support for concurrent workflow executions.

### 4.2 Scalability

- Scalable architecture supporting horizontal scaling.
- Stateless backend services behind a load balancer.
- Independent scaling of rendering workers.

### 4.3 Security

- Secure API key and secret management (encrypted at rest).
- HTTPS enforced for all communications.
- Input validation and sanitization on all endpoints.
- Rate limiting and abuse prevention.

### 4.4 User Interface

- Responsive UI (desktop-first, tablet compatible).
- Dark and Light mode support.
- Accessible UI following WCAG 2.1 guidelines.

### 4.5 Observability

- Audit logs and error tracking.
- Structured logging for all services.
- Health check endpoints for monitoring.

### 4.6 Reliability

- System uptime target of 99.5% or higher.
- Graceful degradation on external service failures.
- Automatic retry and dead-letter queue for failed jobs.

### 4.7 Compliance

- Compliance with platform publishing and content policies (YouTube, TikTok, Meta).
- GDPR-aware data handling for user data.

---

## 5. System Architecture

### 5.1 Overview

```
                        ┌─────────────────────────────────────────┐
                        │              Vercel Platform             │
                        │                                         │
┌─────────────┐         │  ┌──────────────┐   ┌───────────────┐  │     ┌──────────────┐
│   Browser    │────────▶│  │   Frontend    │   │   Backend API  │ │────▶│  Neon         │
│   Client     │         │  │  Vite/React   │──▶│  Express +     │ │     │  PostgreSQL   │
│              │◀────────│  │  Static Files │   │  Prisma ORM    │ │     │  (Serverless) │
└─────────────┘         │  └──────────────┘   │  (Serverless)  │ │     └──────────────┘
                        │                      └───────┬───────┘  │
                        └──────────────────────────────┼──────────┘
                                                       │
                                          ┌────────────▼────────────┐
                                          │   External Services     │
                                          │                         │
                                          │  ┌───────┐ ┌─────────┐ │
                                          │  │OpenAI │ │ElevenLabs│ │
                                          │  │Claude │ │Google TTS│ │
                                          │  └───────┘ └─────────┘ │
                                          │  ┌───────┐ ┌─────────┐ │
                                          │  │Meta   │ │ TikTok  │ │
                                          │  │API    │ │ API     │ │
                                          │  └───────┘ └─────────┘ │
                                          └─────────────────────────┘
```

### 5.2 Technology Stack (MVP)

| Layer         | Technology                                              |
|---------------|---------------------------------------------------------|
| Frontend      | React 18 + TypeScript, Vite, React Flow, Shadcn UI     |
| State Mgmt    | Zustand (client state), React Query (server state)      |
| Styling       | Tailwind CSS + Shadcn UI components                     |
| Backend       | Node.js + Express (Vercel Serverless Functions)         |
| ORM           | Prisma ORM with Zod validation                          |
| Database      | PostgreSQL via Neon (serverless, connection pooling)     |
| Auth          | JWT (jsonwebtoken) + bcrypt                              |
| Hosting       | Vercel (frontend static + backend serverless)            |
| API Format    | REST JSON                                                |

### 5.3 Technology Stack (Post-MVP)

| Layer         | Technology                                              |
|---------------|---------------------------------------------------------|
| Queue         | Redis + BullMQ (requires persistent server)             |
| Workers       | AI workers (LLM, TTS), Render workers (FFmpeg)          |
| Storage       | S3-compatible object storage (AWS S3 / Vercel Blob)     |
| Rendering     | FFmpeg-based rendering workers                           |
| Compute       | Railway / Render / Fly.io (for workers + queue)          |
| Real-time     | WebSockets or SSE (requires persistent server)           |
| Auth Extended | OAuth 2.0 (Google, GitHub providers)                     |

### 5.4 Repository Structure

```
Mohtawa/
├── frontend/                   # Vite + React (deployed as Vercel static)
│   ├── src/
│   │   ├── components/         # UI + builder components
│   │   ├── pages/              # Route pages
│   │   ├── store/              # Zustand stores
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Utilities
│   │   └── types/              # TypeScript types
│   ├── .env                    # VITE_API_BASE
│   └── package.json
├── backend/                    # Express API (deployed as Vercel serverless)
│   ├── api/
│   │   └── index.ts            # Vercel serverless entry point
│   ├── src/
│   │   ├── routes/             # Express route handlers
│   │   ├── middleware/         # Auth, validation, error handling
│   │   ├── services/           # Business logic
│   │   └── app.ts              # Express app setup
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   ├── .env                    # DATABASE_URL, JWT_SECRET, etc.
│   ├── vercel.json             # Serverless routing config
│   └── package.json
├── documents/                  # Project documentation
└── package.json                # Root monorepo scripts
```

### 5.5 Environment Configuration

**Backend (`backend/.env`)**

| Variable        | Description                          | Example                              |
|-----------------|--------------------------------------|--------------------------------------|
| `DATABASE_URL`  | Neon PostgreSQL connection string     | `postgresql://user:pass@host/db`     |
| `JWT_SECRET`    | Secret key for signing JWT tokens     | `your-secret-key-here`               |
| `CORS_ORIGIN`   | Allowed frontend origin               | `https://mohtawa.vercel.app`         |
| `FRONTEND_URL`  | Frontend URL for redirects            | `https://mohtawa.vercel.app`         |
| `NODE_ENV`      | Runtime environment                   | `development` / `production`         |

**Frontend (`frontend/.env`)**

| Variable         | Description                         | Example                              |
|------------------|-------------------------------------|--------------------------------------|
| `VITE_API_BASE`  | Backend API base URL                 | `http://localhost:3001/api` (dev)    |

---

## 6. Deployment Strategy

### 6.1 MVP Deployment (Vercel)

- **Frontend:** Deployed as static site via Vercel (automatic builds from Git).
- **Backend:** Deployed as Vercel Serverless Functions via `api/index.ts` entry point.
- **Database:** Neon PostgreSQL (serverless, auto-scaling, free tier available).
- **CI/CD:** Vercel auto-deploys on push to `main`. Preview deployments on PRs.

### 6.2 Post-MVP Migration Path

When the platform outgrows Vercel serverless limits (job queues, long-running tasks, WebSockets):

- **Backend API + Workers:** Migrate to Railway, Render, or Fly.io.
- **Frontend:** Stays on Vercel.
- **Queue:** Add Redis + BullMQ on the persistent server.
- **Storage:** Add Vercel Blob or AWS S3 for media files.

---

## 7. Future Enhancements

- **AI-based automatic video clip selection** — Intelligent scene detection and clip assembly.
- **Marketplace for third-party node plugins** — Allow community-built nodes and templates.
- **Team collaboration features** — Shared workspaces, real-time co-editing, comments.
- **Analytics dashboard for content performance tracking** — Views, engagement, and growth metrics.
- **AI optimization for engagement prediction** — ML models to predict optimal posting times and content formats.
