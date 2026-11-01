# syntax=docker/dockerfile:1

# Build from the workspace root, the image needs the shared libs:
# docker build -f apps/dartomat-web/Dockerfile .

FROM node:24-alpine AS build

WORKDIR /app

# Provides the pnpm version pinned in `packageManager`.
RUN corepack enable

# No Nx daemon or Nx Cloud inside a one-off build.
ENV NX_DAEMON=false
ENV NX_NO_CLOUD=true

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm nx build dartomat-web

FROM node:24-alpine AS run

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# The server bundle contains its dependencies, so no node_modules are needed at runtime.
# The build output includes `browser/config/app-config.json` with the local values as a
# placeholder. Mount the real file over it at deploy.
COPY --from=build /app/dist/apps/dartomat-web ./dist/dartomat-web

USER node

EXPOSE 4000

CMD ["node", "dist/dartomat-web/server/server.mjs"]
