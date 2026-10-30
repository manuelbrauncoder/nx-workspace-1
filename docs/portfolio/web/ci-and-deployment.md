# CI and deployment

The pipeline lives in [.github/workflows/ci.yml](../.github/workflows/ci.yml). It checks every change and builds a container image for every release.

## Quality checks

The job `test` runs on a push to `main` or `develop`, on every pull request and on a release tag. It runs the same commands you run locally:

| Step         | Command                          |
| ------------ | -------------------------------- |
| Install      | `pnpm install --frozen-lockfile` |
| Lint         | `pnpm lint`                      |
| Format check | `pnpm format:check`              |
| Unit tests   | `pnpm test --watch=false`        |
| Build        | `pnpm build`                     |

- The Node version comes from [.nvmrc](../.nvmrc), the pnpm version from `packageManager` in [package.json](../package.json). A new Node major is changed in `.nvmrc`, in `devEngines` in `package.json` and in the base image of the Dockerfile
- A newer commit on the same branch or pull request cancels the running check

## Releasing an image

Pushing a tag that starts with `v` runs the job `publish-image` after the checks passed:

```bash
git tag v1.2.0
git push origin v1.2.0
```

It builds [docker/Dockerfile](../docker/Dockerfile) and pushes the image to the GitHub Container Registry as `ghcr.io/<owner>/<repo>` with three tags: `latest`, the Git tag and `sha-<short commit>`.

The image has two stages. The first installs the dependencies and runs the production build. The second only contains `dist/portfolio-web`, since the server bundle includes its dependencies, and runs as the unprivileged user `node`.

## Running the image

```bash
docker run -p 4000:4000 \
  -e NG_ALLOWED_HOSTS=example.com,www.example.com \
  -e NG_TRUST_PROXY_HEADERS=x-forwarded-proto,x-forwarded-host,x-forwarded-port,x-forwarded-for,x-forwarded-server \
  -v ./app-config.json:/app/dist/portfolio-web/browser/config/app-config.json:ro \
  ghcr.io/<owner>/<repo>:v1.2.0
```

| Setting                  | Meaning                                                                     |
| ------------------------ | --------------------------------------------------------------------------- |
| `PORT`                   | Port the server listens on, 4000 by default                                 |
| the mounted config       | The [runtime config](api-and-config.md#runtime-config) of the deployment    |
| `NG_ALLOWED_HOSTS`       | Host names the app is reached under, separated by commas                    |
| `NG_TRUST_PROXY_HEADERS` | `X-Forwarded-*` headers to accept from a reverse proxy, separated by commas |

- **Config**: the image contains the local `config/app-config.json` as a placeholder. A deployment mounts its own file with the real `apiBaseUrl` and `siteUrl`. `allowIndexing` is `true` in production only, see [SEO](seo.md#indexing)
- **Allowed hosts**: Angular checks the `Host` header of every request against a list and answers with 400 when the host is not on it, which protects against forged host headers. [angular.json](../angular.json) only lists `localhost` (`security.allowedHosts`), the variable adds the hosts of the deployment
- **Proxy headers**: behind a reverse proxy that terminates TLS, e.g. Traefik, the app only knows it is reached over `https` when it may read `x-forwarded-proto`. Angular drops every `X-Forwarded-*` header that is not listed and logs a warning for it on each request. List the headers your proxy sends, as in the example above. The container must then only be reachable through the proxy
- **Requests to itself**: while rendering, the server loads `/config/app-config.json`, and `/api` as long as `apiBaseUrl` is relative, through the host name of the incoming request. The container therefore has to reach the app under its public host name

## Rules in short

- The pipeline runs lint, format check, tests and build. Run them before you push
- A release is a tag `v*`, nothing else publishes an image
- No environment-specific value in the image. Everything that differs per deployment is in the mounted config or an environment variable
