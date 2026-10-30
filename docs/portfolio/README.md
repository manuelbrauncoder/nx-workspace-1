# Portfolio

The portfolio site of Manuel Braun: `portfolio-web` (Angular) and `portfolio-api` (Express). Both run in production and are built like `angular-base` and `express-api-base`, on the same shared libs. These pages only cover what is specific to the portfolio. Everything else is in the general docs, see [docs/README.md](../README.md).

| Project               | Folder                                                             | Locally                 |
| --------------------- | ------------------------------------------------------------------ | ----------------------- |
| `portfolio-web`       | [apps/portfolio-web](../../apps/portfolio-web)                     | <http://localhost:4100> |
| `portfolio-api`       | [apps/portfolio-api](../../apps/portfolio-api)                     | <http://localhost:3100> |
| `portfolio-contracts` | [packages/portfolio/contracts](../../packages/portfolio/contracts) | Schemas both share      |

Projects of the portfolio carry the tag `scope:portfolio`: they may use the shared libs, but neither `angular-base` nor `express-api-base` may import them and the other way round.

## Running it locally

```bash
docker compose up -d
```

```bash
cp apps/portfolio-api/.env.example apps/portfolio-api/.env
```

Set `SESSION_SECRET` in that file, then create the tables, load the initial content and start both apps:

```bash
pnpm nx run portfolio-api:db:migrate
```

```bash
pnpm nx run portfolio-api:db:seed
```

```bash
pnpm nx run-many -t serve -p portfolio-api portfolio-web
```

The ports differ from the base apps (4000, 3000), so both products run side by side. The admin from `apps/portfolio-api/config/development.json` is created on the first start of the API.

## Pages

| Doc                                   | What it covers                                                          |
| ------------------------------------- | ----------------------------------------------------------------------- |
| [Start page](web/portfolio.md)        | Sections of the start page, their content from the API, `Localized`     |
| [Admin area](web/admin.md)            | Users, contact messages, editors for the start page and the legal pages |
| [Legal pages](web/legal-pages.md)     | Imprint, privacy, accessibility and cookies as CMS content              |
| [CMS content](api/cms-content.md)     | Portfolio sections, media, contact messages, legal pages, seed          |
| [Configuration](api/configuration.md) | The config file of `portfolio-api`, mail and `publicUrl`                |
| [Deployment](api/deployment.md)       | Images, release tags, the Portainer stack with migrate and seed         |

## Differences to the base apps

- **Web:** Trail theme with its own fonts, `--brand` is the trail-marker yellow, `.page-container` is 81rem wide. The start page is full-bleed (`shellLayout('full-bleed')`), its sections are reached through fragment links (`/#projects`). `APP_NAME` is `Manuel Braun`
- **API:** routes under `/api/v1` (`createServer({ prefix })`), sign-up disabled in production (`auth.signUpEnabled: false`), mail forwarding of contact messages, `publicUrl` as the base of image URLs, a seed script for the initial content
- **DTOs:** media, contact, legal pages, users, auth and notes come from `@portfolio/contracts` and `@contracts`. The sections of the start page keep the hand-written `portfolio.dto.ts`, since their schemas are built by a helper that loses the types
