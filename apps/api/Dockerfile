# Build from the repository root:  docker build -f apps/api/Dockerfile .
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Manifests first: the dependency layer is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @kanban/api...

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @kanban/shared build && pnpm --filter @kanban/api build
# Self-contained folder with dist + production dependencies only (incl. @kanban/shared).
RUN pnpm --filter @kanban/api deploy --prod --legacy /out

FROM node:24-alpine AS runtime
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1
# Apply pending migrations, then start the API.
CMD ["sh", "-c", "node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run && exec node dist/main"]
