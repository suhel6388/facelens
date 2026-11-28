FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/validation/package.json packages/validation/
COPY packages/database/package.json packages/database/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages packages
COPY apps/api apps/api
COPY turbo.json ./

RUN pnpm --filter @app/types build \
  && pnpm --filter @app/validation build \
  && pnpm --filter @app/database build \
  && pnpm --filter @app/api build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@12.18.0 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY --from=base /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/packages ./packages
COPY --from=base /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=base /app/apps/api/dist ./apps/api/dist
COPY --from=base /app/apps/api/package.json ./apps/api/package.json

RUN mkdir -p /var/lib/facelens/storage && chown -R node:node /var/lib/facelens/storage
USER node

EXPOSE 4000
CMD ["node", "apps/api/dist/server.js"]
