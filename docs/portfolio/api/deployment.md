# Deployment

The API is deployed as a Docker image. The same image is used twice: once as a short-lived container that applies database migrations, and once as the API itself.

## Building the image

The image is built by the GitHub Actions workflow in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

- Every push to `main` and every pull request runs the checks: lint, format check, typecheck, tests (against a Postgres service container) and build.
- Pushing a tag that starts with `v` runs the same checks and then publishes the image to the GitHub Container Registry.

```bash
git tag v1.0.0
git push origin v1.0.0
```

The image is published as `ghcr.io/<owner>/<repository>` with three tags: the git tag (`v1.0.0`), `latest` and `sha-<short commit>`. Use the git tag in the stack, so a redeploy never pulls a different version by accident.

The [Dockerfile](../Dockerfile) compiles the TypeScript and produces an image with only production dependencies, the compiled code in `dist/`, the migrations in `drizzle/` and the initial portfolio content in `seed/`.

## What the server needs

| Item           | Details                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| PostgreSQL     | Reachable from the containers; the connection string goes into `DATABASE_URL`                               |
| Config file    | A JSON file on the host, mounted read-only into the container; its path goes into `CONFIG_PATH`             |
| Uploads folder | A host folder or volume mounted at `/app/uploads`, so images survive a redeploy                             |
| Secrets        | `SESSION_SECRET` (at least 32 characters), `SMTP_PASSWORD` and the database credentials, as stack variables |
| SMTP account   | For forwarding contact messages; host, user and addresses go into the config file (`mail`)                  |
| Reverse proxy  | Terminates HTTPS and forwards to port 3000                                                                  |

Create the config file from [`config/production.example.json`](../config/production.example.json). All settings are explained in [Configuration](configuration.md).

## The stack

[`docker-compose.prod.example.yml`](../docker-compose.prod.example.yml) is a template for a Portainer stack behind Traefik. It defines two services:

- **`migrate`** runs `node dist/scripts/migrate.js` and exits. It only gets `DATABASE_URL`.
- **`api`** starts only after `migrate` has finished successfully. It gets the config file, the uploads volume and the environment variables.

This order guarantees that the API never runs against an outdated schema. If a migration fails, the new API container does not start.

Adjust in the template: the image name and tag, the host name in the Traefik rule, the two host paths, and the network names.

## Deploying with Portainer

The template expects two things that already exist on the server: a Traefik instance on the external network `web`, and a Postgres container named `postgres` on the external network `api-network`.

1. **Publish the image** by pushing a version tag, as shown above. The workflow builds for `linux/amd64`.
2. **Give Portainer access to the image.** If the package on ghcr.io is private, add the registry under _Registries_ (`ghcr.io`, your GitHub user, a personal access token with `read:packages`).
3. **Create the database.** The `migrate` service creates the tables, not the database itself: `CREATE DATABASE ...` once in the existing Postgres.
4. **Create the config file and the uploads folder on the host**, at the two paths used under `volumes` in the stack. The config file is a copy of [`config/production.example.json`](../config/production.example.json) with your values; see the checklist below.
5. **Create the stack.** _Stacks → Add stack → Web editor_, paste the template and adjust it. Set these under _Environment variables_:

   | Variable            | Value                                                      |
   | ------------------- | ---------------------------------------------------------- |
   | `POSTGRES_USER`     | Database user                                              |
   | `POSTGRES_PASSWORD` | Its password. Avoid `@`, `:` and `/`, it is put into a URL |
   | `POSTGRES_DB`       | Name of the database from step 3                           |
   | `SESSION_SECRET`    | Output of `openssl rand -hex 32`                           |
   | `SMTP_PASSWORD`     | Password of the SMTP account in `mail.user`                |

6. **Deploy and check.** The `migrate` container should log `Migrations applied` and stop with exit code 0; that it is shown as stopped afterwards is expected. Then the `api` container starts and `https://your-api-host/health` answers `{"status":"ok"}`.

7. **Load the initial content once.** In the running `api` container (Portainer: _Containers → api → Console_), run `node dist/scripts/seed.js`. It logs the created sections; running it again only reports `Nothing to seed`. See [CMS content](cms-content.md#seed).

If the `api` container restarts in a loop, its log starts with `Invalid configuration:` followed by the setting or variable that is wrong.

The template is for a standalone Docker environment. Swarm stacks ignore `depends_on`, so the API would not wait for the migrations there.

## Go-live checklist

In the production config file:

- [ ] `trustProxy` is `1` (one proxy in front of the API). Without it, signing in fails because the secure cookie is not set.
- [ ] `session.secureCookie` is `true`.
- [ ] `cors.origins` contains the exact origin of the frontend, e.g. `https://example.com`.
- [ ] `publicUrl` is the public origin of the API, e.g. `https://example.com` when it is served under `/api` of the frontend. Image URLs are built from it.
- [ ] `auth.signUpEnabled` is `false`, unless visitors should be able to create accounts.
- [ ] `mail` points to a working SMTP account, `mail.to` is the inbox that should get contact messages, and `mail.enabled` is `true`.
- [ ] `docs.enabled` is set deliberately. `true` makes the API reference public at `/docs`; it shows the endpoints, not data.
- [ ] `logLevel` is `info`.
- [ ] `admin.email` and `admin.password` are set to real values before the first start. The admin is created once, from these values; see [Configuration](configuration.md#the-admin-password).

In the stack:

- [ ] `SESSION_SECRET` is a long random value that is not used anywhere else.
- [ ] `SMTP_PASSWORD` is set.
- [ ] `NODE_ENV` is `production`.
- [ ] The uploads folder is mounted and writable by the container.
- [ ] The config file is mounted and `CONFIG_PATH` points to the path inside the container.

On the domain:

- [ ] Frontend and API share the same registrable domain (e.g. `app.example.com` and `api.example.com`). A server-rendered frontend needs the same host, with the API under a path such as `/api`. See [Authentication](authentication.md#frontend-integration).

After the first deploy, `https://your-api-host/health` should answer `{"status":"ok"}`.

## Updating

1. Push a new version tag and wait for the workflow to publish the image.
2. Change the tag for both services in the stack and redeploy.

Pending migrations are applied by the `migrate` service automatically.

## Backups

Two things hold data and both need a backup: the Postgres database and the uploads folder. They belong together: the database stores which image files exist (notes and portfolio media), the folder stores the files.

## Running more than one instance

The base is built for a single API container. Two things would need to change before scaling out:

- **Uploads** are on the local file system; all instances would need the same shared volume, or object storage.
- **The rate limits** (auth and contact form) count in memory per instance.

Sessions are already shared, because they are stored in Postgres.
