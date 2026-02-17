# Mohtawa

**AI Content Automation Platform** — Build visual workflows to automate your content creation pipeline. Generate scripts, synthesize voice, render video, and publish — all in one platform.

## Features

- **Visual Workflow Builder** — Drag-and-drop canvas with 22 node types across 7 categories
- **AI Integration** — Real OpenAI (GPT-4o, TTS) and Anthropic (Claude) support
- **Workflow Execution** — Backend engine with topological sort, real-time status updates
- **API Key Management** — Encrypted (AES-256-GCM) storage for third-party service keys
- **Authentication** — JWT-based auth with registration, login, and protected routes
- **Dark/Light Mode** — Persisted theme preference

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI |
| State | Zustand, React Query |
| Canvas | React Flow (@xyflow/react) |
| Backend | Express.js, TypeScript |
| Database | Prisma ORM, SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT, bcryptjs |
| AI | OpenAI SDK, Anthropic REST API |
| Deployment | Vercel (frontend + serverless backend) |

## Project Structure

```
Mohtawa/
├── frontend/          # React + Vite + Shadcn UI
│   ├── src/
│   │   ├── components/   # UI components, builder, error boundary
│   │   ├── pages/        # Dashboard, Builder, Settings, Login, Register
│   │   ├── store/        # Zustand stores (auth, workflow, node definitions)
│   │   ├── hooks/        # Custom hooks (useTheme)
│   │   ├── lib/          # API client, utilities
│   │   └── types/        # TypeScript types
│   └── vercel.json
├── backend/           # Express + TypeScript API
│   ├── src/
│   │   ├── routes/       # Auth, workflows, settings
│   │   ├── services/     # Business logic (auth, workflows, execution, API keys)
│   │   ├── executors/    # Node executors (LLM, TTS, HTTP, delay, conditional)
│   │   ├── middleware/   # Auth, validation, error handling
│   │   └── lib/          # Prisma client, crypto utilities
│   ├── prisma/           # Schema, migrations
│   ├── api/              # Vercel serverless entry point
│   └── vercel.json
├── documents/         # Planning docs, SRS
└── package.json       # Root monorepo scripts
```

## Getting Started

### Prerequisites

- Node.js >= 18
- npm

### Install

```bash
npm run install:all
```

### Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your JWT_SECRET and ENCRYPTION_SECRET

# Frontend
cp frontend/.env.example frontend/.env
```

### Run Database Migrations

```bash
cd backend
npx prisma migrate dev
```

### Development

```bash
# Run both frontend and backend
npm run dev

# Or individually
npm run dev:frontend   # http://localhost:8080
npm run dev:backend    # http://localhost:3001
```

### Build

```bash
npm run build:frontend
npm run build:backend
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Get current user |

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows/:id` | Get workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/duplicate` | Duplicate workflow |
| POST | `/api/workflows/:id/execute` | Execute workflow |
| GET | `/api/workflows/:id/executions` | Execution history |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/keys` | List API keys (masked) |
| POST | `/api/settings/keys` | Add/update API key |
| DELETE | `/api/settings/keys/:id` | Delete API key |

## Node Types (22)

| Category | Nodes |
|----------|-------|
| Triggers | Manual Trigger, Schedule, Webhook |
| AI | Generate Script, Text Summarizer, Prompter |
| Voice | Text to Speech, Voice Clone |
| Video | Render Video, Clip Joiner |
| Social | YouTube Publisher, TikTok Publisher, Meta Publisher |
| Logic | If/Else, Loop, Delay, Merge |
| Utilities | Set Variable, HTTP Request, Notification, Logger |

## Security

- Passwords hashed with bcryptjs
- JWT tokens for session management
- API keys encrypted with AES-256-GCM
- Rate limiting on auth endpoints (20 req/15min login, 5 req/hr registration)
- Helmet security headers
- Input validation with Zod
- SQL injection protection via Prisma ORM

## Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel
```

Set environment variable:
- `VITE_API_BASE` = your backend URL + `/api`

### Backend (Vercel Serverless)

```bash
cd backend
vercel
```

Set environment variables:
- `DATABASE_URL` = PostgreSQL connection string (e.g. Neon)
- `JWT_SECRET` = random 64+ character string
- `ENCRYPTION_SECRET` = separate random 64+ character string
- `CORS_ORIGIN` = frontend production URL
- `NODE_ENV` = `production`

## License

Private project.
