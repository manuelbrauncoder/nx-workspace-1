# syntax=docker/dockerfile:1

# Build from the workspace root, the image needs the shared libs:
# docker build -f apps/vyte-api/Dockerfile .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Provides the pnpm version pinned in `packageManager`.
RUN corepack enable
WORKDIR /app

FROM base AS build
# No Nx daemon or Nx Cloud inside a one-off build.
ENV NX_DAEMON=false
ENV NX_NO_CLOUD=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Bundles the API with the shared libs and writes package.json and a lockfile with only the
# runtime dependencies next to it.
RUN pnpm nx prune-lockfile vyte-api

FROM base AS prod-deps
COPY --from=build /app/dist/apps/vyte-api/package.json /app/dist/apps/vyte-api/pnpm-lock.yaml /app/dist/apps/vyte-api/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/apps/vyte-api/package.json ./
COPY --from=build /app/dist/apps/vyte-api ./dist
# SQL migrations, applied by: node dist/scripts/migrate.js
COPY apps/vyte-api/drizzle ./drizzle
# Text of the legal pages, created at every start if missing: seedLegalOnStart() in src/index.ts
COPY apps/vyte-api/seed ./seed
# Runs as the unprivileged user `node` (uid 1000). The API only writes to uploads/: the folder
# exists here for a start without a mount, a mounted host folder has to belong to uid 1000.
RUN mkdir uploads && chown node:node uploads
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
