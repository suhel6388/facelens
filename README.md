# FaceLens — Authorized Private Collection Similarity Search

**FaceLens** is a consent-first visual similarity search SaaS platform. Organizations and teams upload and manage **authorized private image collections** with documented permission, run asynchronous visual similarity comparisons strictly within their own workspace collections, and track consent, retention, billing, and audit logs.

> **Privacy & Compliance Principle:** FaceLens never searches public websites or social platforms. All results are presented as probabilistic **similarity estimates** within an authorized private collection — never as positive identity determinations.

---

## What FaceLens Does

- **Authorized Private Collections:** Create workspace-isolated image collections with documented purpose and legal authority confirmations.
- **Consent & Withdrawal Lifecycle:** Record explicit authorization basis per image, support instant consent withdrawal, and purge derived/stored data on deletion.
- **Secure Image Upload Pipeline:** Drag-and-drop uploads with client & server MIME/magic-byte verification, file-size and dimension checks, EXIF/text metadata stripping, and HMAC-signed private storage URLs.
- **Asynchronous Similarity Search:** Express API + Redis/BullMQ worker pipeline (`QUEUED -> VALIDATING -> PROCESSING -> COMPLETED`) calling an isolated Python FastAPI + OpenCV microservice.
- **User & Admin Dashboards:** Workspace overview with usage charts, live search progress & sorted results, collection management, team permissions, Razorpay-ready billing & invoices, and an `ADMIN`-protected platform portal.

---

## Folder Structure

```text
├── apps/
│   ├── web/                        # Next.js 15 App Router frontend
│   │   ├── src/app/                # Marketing pages, auth, dashboard, collections, searches, billing, settings, profile, admin
│   │   ├── src/components/         # Auth forms, dashboard charts, upload dropzone, admin portal, layout shell
│   │   ├── src/hooks/              # Workspace session hook
│   │   ├── src/lib/                # Typed API client with CSRF handling
│   │   ├── e2e/                    # Playwright E2E smoke tests
│   │   └── Dockerfile              # Production Next.js Docker image
│   ├── api/                        # Express.js TypeScript REST API & BullMQ worker
│   │   ├── src/config/             # Environment loader (.env auto-load in dev)
│   │   ├── src/lib/                # Pino logger, Redis/BullMQ queue, private storage, image security, AI client
│   │   ├── src/middleware/         # Auth/RBAC, CSRF, rate limiting, Zod validation, request logging, error handler
│   │   ├── src/modules/            # Auth, Users, Workspaces, Collections, Consent, Uploads, Searches, Billing, Admin
│   │   ├── src/openapi.ts          # OpenAPI 3.0 specification (/api/docs)
│   │   └── Dockerfile              # Production Express API Docker image
│   └── ai-service/                 # Python FastAPI + OpenCV similarity microservice
│       ├── app/                    # Vision quality checks, face/region detection, isolated collection indexes
│       ├── tests/                  # Pytest suite with synthetic image tests
│       └── Dockerfile              # Production Python AI service Docker image
├── packages/
│   ├── database/                   # Prisma schema (13 models) & PostgreSQL migrations
│   ├── types/                      # Shared TypeScript DTOs & API response envelopes
│   ├── validation/                 # Shared Zod validation schemas
│   ├── ui/                         # Shared dark-theme UI components & design tokens
│   ├── eslint-config/              # Shared ESLint 9 flat configs
│   └── typescript-config/          # Shared strict TypeScript presets
├── deploy/
│   ├── nginx/nginx.conf            # Production reverse proxy & TLS configuration
│   └── scripts/backup-postgres.sh  # Automated daily PostgreSQL backup script
├── docs/
│   └── DEPLOYMENT.md               # Production deployment & operations guide
├── .github/workflows/ci.yml        # GitHub Actions CI pipeline
├── docker-compose.yml              # Local PostgreSQL & Redis
├── docker-compose.apps.yml         # Full-stack Docker setup (DB, Redis, AI, API, Web)
├── docker-compose.prod.yml         # Production stack with Nginx & automated backups
├── .env.example                    # Local environment template
└── .env.production.example         # Production environment template
```

---

## Prerequisites

- **Node.js** `22+`
- **pnpm** `12.18.0`
- **Python** `3.11+` (for local AI service development)
- **Docker Desktop** (for PostgreSQL, Redis, or full-stack containers)

---

## Setup & Running

### Option 1: Run Everything with Docker (Recommended)

Build all dependencies, run Prisma migrations automatically, and start PostgreSQL, Redis, AI service, Express API, and Next.js Web:

```powershell
docker compose -f docker-compose.apps.yml up --build
```

- **Web App:** `http://localhost:3000`
- **Express API & Swagger Docs:** `http://localhost:4000` (`/api/docs`)
- **AI Service Health:** `http://localhost:8000/health`

---

### Option 2: Local Development Setup

#### 1. Configure Environment Variables

Copy `.env.example` to `.env` in the repository root and generate strong random secrets for `SESSION_SECRET`, `ACCESS_TOKEN_SECRET`, and `REFRESH_TOKEN_SECRET`:

```powershell
Copy-Item .env.example .env
1..3 | ForEach-Object { node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" }
```

#### 2. Install Dependencies & Start Databases

```powershell
pnpm install
docker compose up -d
pnpm --filter @app/database db:generate
pnpm --filter @app/database exec prisma migrate deploy
```

#### 3. Start the Applications

Run each service (or `pnpm dev` at the root for JS/TS apps):

```powershell
# Terminal 1 — Express API (port 4000)
pnpm --filter @app/api dev

# Terminal 2 — Next.js Web (port 3000)
pnpm --filter @app/web dev

# Terminal 3 — Python AI Service (port 8000)
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## Verification & Testing

```powershell
# Build, lint, typecheck, and format check across all JS/TS packages
pnpm build
pnpm lint
pnpm typecheck
pnpm format:check

# Run unit & integration tests
pnpm --filter @app/api test
pnpm --filter @app/web test

# Run Python AI service tests
apps\ai-service\.venv\Scripts\python.exe -m pytest apps/ai-service/tests -v

# Run Playwright E2E tests (requires web server running)
pnpm test:e2e

# Check dependency vulnerabilities
pnpm security:audit
```

---

## Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for configuring `.env.production`, TLS certificates in `deploy/certs/`, Nginx reverse proxying, automated PostgreSQL backups, and launching [docker-compose.prod.yml](docker-compose.prod.yml).
