# Project Planning Document

## Mohtawa — AI Content Automation Workflow Platform

**Date:** February 16, 2026
**Methodology:** Iterative (phase-based MVP approach)

---

## Table of Contents

1. [Project Phases Overview](#1-project-phases-overview)
2. [Phase 1 — Foundation](#2-phase-1--foundation)
3. [Phase 2 — Workflow Builder](#3-phase-2--workflow-builder)
4. [Phase 3 — Workflow Persistence & Execution](#4-phase-3--workflow-persistence--execution)
5. [Phase 4 — AI & External Integrations](#5-phase-4--ai--external-integrations)
6. [Phase 5 — Polish & Deploy MVP](#6-phase-5--polish--deploy-mvp)
7. [Post-MVP Phases](#7-post-mvp-phases)
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

### Phase 7 — Video Rendering

- FFmpeg-based video rendering workers.
- Template system for video generation.
- S3/Vercel Blob storage for media files.

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
│  ApiKey   │
│          │
│ service  │
│ encrypted│
│ Key      │
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

### Settings

| Method | Route                  | Description             | Auth     |
|--------|------------------------|-------------------------|----------|
| GET    | `/api/settings/keys`   | List user's API keys    | Required |
| POST   | `/api/settings/keys`   | Store a new API key     | Required |
| DELETE | `/api/settings/keys/:id` | Delete an API key     | Required |

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
