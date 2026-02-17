# Software Requirements Specification (SRS)

## AI Content Automation Workflow Platform

**Version:** 1.1
**Date:** February 16, 2026
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
| Logic       | Conditional Branch, Loop, Delay, Merge           |
| Utilities   | HTTP Request, File Storage, Notification, Logger |

### 3.5 Workflow Execution Engine

- Sequential and parallel node execution.
- Logging of each node's input, output, and status.
- Retry capability with configurable retry count and backoff.
- Error handling with fallback paths.

### 3.6 Scheduling System

- Cron-based scheduling for time-triggered workflows.
- Recurring and one-time schedule support.
- Timezone-aware scheduling.

### 3.7 AI API Integration

- Integration with LLM providers (OpenAI, Anthropic, etc.) for script and content generation.
- Text-to-Speech (TTS) integration (ElevenLabs, Google Cloud TTS, etc.).
- Configurable API keys per user or workspace.

### 3.8 Video Rendering Engine

- Template-based video rendering using FFmpeg.
- Support for combining audio, images, and text overlays.
- Background rendering via worker queue.
- Output format configuration (resolution, codec, duration).

### 3.9 Social Media Publishing

- Meta (Facebook/Instagram) API integration for automated posting.
- TikTok API integration for video uploads.
- Scheduling posts at optimal times.
- Status tracking for published content.

### 3.10 Workflow Versioning and History

- Version control for workflow definitions.
- Execution history with detailed logs per run.
- Ability to rollback to previous workflow versions.

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
