## 3.2.0 (2026-11-21)

### 🚀 Features

- **portfolio-api:** hero role in the CMS, unused hero and settings fields removed ([9a5376e](https://github.com/manuelbrauncoder/nx-workspace-1/commit/9a5376e))

## 3.1.0 (2026-11-20)

### 🚀 Features

- **portfolio-api:** add a draft state for projects ([4710e75](https://github.com/manuelbrauncoder/nx-workspace-1/commit/4710e75))

## 3.0.1 (2026-11-19)

### 🩹 Fixes

- **workspace:** runtime images no longer ship npm, corepack and yarn ([2995ed0](https://github.com/manuelbrauncoder/nx-workspace-1/commit/2995ed0))
- **portfolio-api:** contact form answers right away, mail over STARTTLS on port 587 ([55d965f](https://github.com/manuelbrauncoder/nx-workspace-1/commit/55d965f))

# 3.0.0 (2026-11-18)

### 🚀 Features

- ⚠️  **portfolio-api:** several sortable images and a rich-text description per project ([5796b27](https://github.com/manuelbrauncoder/nx-workspace-1/commit/5796b27))
- **server-auth:** account links for closed sign-up ([cdddc2b](https://github.com/manuelbrauncoder/nx-workspace-1/commit/cdddc2b))

### 🩹 Fixes

- **server-core:** sanitize rich text in one place with the contract's link rules ([1135c17](https://github.com/manuelbrauncoder/nx-workspace-1/commit/1135c17))

### ⚠️  Breaking Changes

- **portfolio-api:** several sortable images and a rich-text description per project  ([5796b27](https://github.com/manuelbrauncoder/nx-workspace-1/commit/5796b27))
  `projects.items[].image` is replaced by `images`, and
  `projects.items[].description` is HTML. Release together with the portfolio-web update.

# 2.0.0 (2026-11-07)

### 🩹 Fixes

- ⚠️  run the express-api-base and portfolio-api images as the unprivileged user node ([47f9235](https://github.com/manuelbrauncoder/nx-workspace-1/commit/47f9235))

### ⚠️  Breaking Changes

- run the express-api-base and portfolio-api images as the unprivileged user node  ([47f9235](https://github.com/manuelbrauncoder/nx-workspace-1/commit/47f9235))
  the uploads folder mounted at /app/uploads must belong to uid 1000. Run
  `sudo chown -R 1000:1000 <folder>` on the host once before deploying, otherwise uploads fail
  with EACCES.

## 1.2.0 (2026-11-04)

### 🚀 Features

- **server-core:** report the app version in /health ([588c31e](https://github.com/manuelbrauncoder/nx-workspace-1/commit/588c31e))