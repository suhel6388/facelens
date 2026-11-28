# FaceLens Production Deployment Guide

## Architecture Overview

- **Web (`apps/web`)**: Next.js 15 frontend behind Nginx TLS termination.
- **API (`apps/api`)**: Express REST API, BullMQ search worker, Pino structured JSON logging, and Swagger/OpenAPI docs (`/api/docs`).
- **AI Service (`apps/ai-service`)**: Internal FastAPI + OpenCV microservice with isolated per-`(workspace_id, collection_id)` indexes.
- **Data Stores**: PostgreSQL 16 (with Prisma migrations) and Redis 7 (BullMQ job queue).
- **Private Storage**: Mounted volume `/var/lib/facelens/storage` outside public web roots; all images are magic-byte verified, EXIF-stripped, and accessed via authenticated routes.

## 1. Environment Configuration

1. Copy `.env.production.example` to `.env.production` and populate strong secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`).
2. Place TLS certificates (`fullchain.pem` and `privkey.pem`) in `deploy/certs/` and update `server_name` in `deploy/nginx/nginx.conf`.

## 2. Database Migration

```bash
pnpm --filter @app/database exec prisma migrate deploy
```

## 3. Build & Start Production Stack

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

## 4. Monitoring, Logging & Backups

- **Health Checks**:
  - Public API health: `GET /api/v1/health`
  - Admin system health: `GET /api/v1/admin/system-health` (requires `ADMIN` role)
- **Structured Logging**: Express API emits Pino JSON logs with authorization headers and cookies redacted.
- **PostgreSQL Backups**: The `postgres-backup` container runs `deploy/scripts/backup-postgres.sh` daily, writing gzipped dumps to the `postgres_backups` volume with 14-day retention.
- **Security Scanning**: Run `pnpm security:audit` in CI or before releases to check dependencies.
