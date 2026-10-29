# CI and deployment

The pipeline lives in [.github/workflows/ci.yml](../.github/workflows/ci.yml). It checks every change and builds a container image for every release.

## Quality checks

The job `checks` runs on a push to `main`, on every pull request and on a release tag. It runs the same commands you run locally:

| Step                           | Command                                         |
| ------------------------------ | ----------------------------------------------- |
| Install                        | `pnpm install --frozen-lockfile`                |
| Format check                   | `pnpm format:check`                             |
| Lint, type check, tests, build | `pnpm nx affected -t lint typecheck test build` |

- `nx affected` only runs the projects a change touches, compared with the last successful run on `main` (`nrwl/nx-set-shas`). A release tag runs every project with `nx run-many`

- The Node version comes from [.nvmrc](../.nvmrc), the pnpm version from `packageManager` in [package.json](../package.json). A new Node major is changed in `.nvmrc`, in `devEngines` in `package.json` and in the base image of the Dockerfile
- A newer commit on the same branch or pull request cancels the running check

## Releasing an image

Each app has its own release tag, so the apps of the workspace are released independently. Pushing a tag that starts with `angular-base-v` runs the job `publish-angular-base` after the checks passed:

```bash
git tag angular-base-v1.2.0
git push origin angular-base-v1.2.0
```

It builds [apps/angular-base/Dockerfile](../apps/angular-base/Dockerfile) from the workspace root and pushes the image to the GitHub Container Registry as `ghcr.io/<owner>/angular-base` with three tags: `latest`, the version (`v1.2.0`) and `sha-<short commit>`.

The image has two stages. The first installs the dependencies of the workspace and runs `nx build angular-base`. The second only contains the build output, since the server bundle includes its dependencies, and runs as the unprivileged user `node`. The output is copied to `dist/angular-base`, the same path as before the monorepo, so existing deployments keep their config mount.

To build the image locally, run from the workspace root:

```bash
docker build -f apps/angular-base/Dockerfile -t angular-base .
```

## Running the image

```bash
docker run -p 4000:4000 \
  -e NG_ALLOWED_HOSTS=example.com,www.example.com \
  -e NG_TRUST_PROXY_HEADERS=x-forwarded-proto,x-forwarded-host,x-forwarded-port,x-forwarded-for,x-forwarded-server \
  -v ./app-config.json:/app/dist/angular-base/browser/config/app-config.json:ro \
  ghcr.io/<owner>/angular-base:v1.2.0
```

| Setting                  | Meaning                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `PORT`                   | Port the server listens on, 4000 by default                                 |
| the mounted config       | The [runtime config](api-and-config.md#runtime-config) of the deployment    |
| `NG_ALLOWED_HOSTS`       | Host names the app is reached under, separated by commas                    |
| `NG_TRUST_PROXY_HEADERS` | `X-Forwarded-*` headers to accept from a reverse proxy, separated by commas |

- **Config**: the image contains the local `apps/angular-base/config/app-config.json` as a placeholder. A deployment mounts its own file with the real `apiBaseUrl` and `siteUrl`. `allowIndexing` is `true` in production only, see [SEO](seo.md#indexing)
- **Allowed hosts**: Angular checks the `Host` header of every request against a list and answers with 400 when the host is not on it, which protects against forged host headers. [apps/angular-base/project.json](../apps/angular-base/project.json) only lists `localhost` (`security.allowedHosts`), the variable adds the hosts of the deployment
- **Proxy headers**: behind a reverse proxy that terminates TLS, e.g. Traefik, the app only knows it is reached over `https` when it may read `x-forwarded-proto`. Angular drops every `X-Forwarded-*` header that is not listed and logs a warning for it on each request. List the headers your proxy sends, as in the example above. The container must then only be reachable through the proxy
- **Requests to itself**: while rendering, the server loads `/config/app-config.json`, and `/api` as long as `apiBaseUrl` is relative, through the host name of the incoming request. The container therefore has to reach the app under its public host name

## Rules in short

- The pipeline runs lint, format check, tests and build. Run them before you push
- A release is a tag `angular-base-v*`, nothing else publishes an image
- No environment-specific value in the image. Everything that differs per deployment is in the mounted config or an environment variable
