FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/ui/package.json packages/ui/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/web/package.json apps/web/

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps/web apps/web
COPY turbo.json ./

ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @app/types build \
  && pnpm --filter @app/validation build \
  && pnpm --filter @app/ui build \
  && pnpm --filter @app/web build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=base /app/apps/web/.next ./apps/web/.next
COPY --from=base /app/apps/web/package.json ./apps/web/package.json

USER node
EXPOSE 3000
CMD ["pnpm", "--filter", "@app/web", "start"]
