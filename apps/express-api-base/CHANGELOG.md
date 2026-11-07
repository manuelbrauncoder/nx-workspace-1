## 0.2.0 (2026-11-07)

### 🩹 Fixes

- ⚠️  run the express-api-base and portfolio-api images as the unprivileged user node ([47f9235](https://github.com/manuelbrauncoder/nx-workspace-1/commit/47f9235))

### ⚠️  Breaking Changes

- run the express-api-base and portfolio-api images as the unprivileged user node  ([47f9235](https://github.com/manuelbrauncoder/nx-workspace-1/commit/47f9235))
  the uploads folder mounted at /app/uploads must belong to uid 1000. Run
  `sudo chown -R 1000:1000 <folder>` on the host once before deploying, otherwise uploads fail
  with EACCES.

## 0.1.1 (2026-11-04)

### 🚀 Features

- **server-core:** report the app version in /health ([588c31e](https://github.com/manuelbrauncoder/nx-workspace-1/commit/588c31e))