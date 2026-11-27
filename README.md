# FaceLens — Authorized Private Collection Similarity Search

Monorepo for an original, consent-first visual similarity search SaaS built with **Next.js App Router**, **Express.js (TypeScript)**, **Python FastAPI**, **PostgreSQL + Prisma**, and **Redis + BullMQ** using **pnpm** and **Turborepo**.

## Monorepo Structure

```text
├── apps/
│   ├── web/            # Next.js App Router frontend
│   ├── api/            # Express.js REST API
│   └── ai-service/     # Python FastAPI internal similarity service
├── packages/
│   ├── database/       # Prisma schema and shared client
│   ├── eslint-config/  # Shared ESLint 9 flat configs
│   ├── types/          # Shared TypeScript domain & API types
│   ├── typescript-config/ # Shared strict tsconfig presets
│   ├── ui/             # Shared UI utilities and design tokens
│   └── validation/     # Shared Zod validation schemas
├── docker-compose.yml  # Local PostgreSQL & Redis
├── pnpm-workspace.yaml
└── turbo.json
```

## Prerequisites

- Node.js LTS (v22+)
- `pnpm` (`12.18.0`)
- Python `3.11+`
- Docker Desktop (for PostgreSQL and Redis)

## Local Development

```bash
# 1. Install JS/TS workspace dependencies
pnpm install

# 2. Start PostgreSQL & Redis
docker compose up -d postgres redis

# 3. Generate Prisma client
pnpm --filter @app/database db:generate

# 4. Run checks across all JS/TS workspaces
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
```

### Python AI Service

```bash
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
pytest
```

## Delivery Status

- **Phase 1:** Monorepo foundation, linting, formatting, shared types, Prisma schema foundation, and service skeletons.
