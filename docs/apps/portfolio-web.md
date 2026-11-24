# portfolio-web

The portfolio site of Manuel Braun, in production. A start page with the sections hero, about, projects, skills and contact, the legal pages and an admin area that edits all of it. Every text and image comes from `portfolio-api`. Built like `angular-base` on the same libs, so this page only covers what differs.

| Item    | Value                                                                                               |
| ------- | --------------------------------------------------------------------------------------------------- |
| Folder  | [apps/portfolio-web](../../apps/portfolio-web)                                                      |
| Tags    | `type:app`, `scope:portfolio`                                                                       |
| Locally | <http://localhost:4100>, talks to `portfolio-api` on <http://localhost:3100/api/v1>                 |
| Libs    | `core`, `ui`, `styles`, `contracts`, `portfolio-contracts`                                          |
| Image   | `ghcr.io/<owner>/nx1-portfolio-web`, tag `nx1-portfolio-web-v*`, see [Deployment](../deployment.md) |

## Running it

The start page needs the API with its initial content, see [portfolio-api](portfolio-api.md#running-it). Both together:

```bash
pnpm nx run-many -t serve -p portfolio-api portfolio-web
```

The ports differ from the base apps (4000, 3000), so both products run side by side. `build -c watch` and `server` work as for [angular-base](angular-base.md#running-it).

## Pages

| Route                                                | Feature             | Content                                                              |
| ---------------------------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `/` with `#about`, `#projects`, …                    | `portfolio`         | The start page, full-bleed, sections reached by fragment links       |
| `/imprint`, `/privacy`, `/accessibility`, `/cookies` | `legal`             | Legal pages as HTML from the API, with links within the site         |
| `/admin`, `/admin/users`, `/admin/messages`          | `admin`             | Hub, users and the inbox of the contact form, behind the admin guard |
| `/admin/portfolio/…`                                 | `portfolio-editor`  | One form per section of the start page                               |
| `/admin/legal/…`                                     | `legal-editor`      | The legal pages in both languages                                    |
| `/sign-in`, `/sign-up`                               | `auth`              | Sign-in. Sign-up only while `allowSignUp` is set                     |
| `/notes`, `/showcase`                                | `notes`, `showcase` | Taken over from the base, not linked in the navigation               |

Details: [Start page](../portfolio/web/portfolio.md), [Admin area](../portfolio/web/admin.md), [Legal pages](../portfolio/web/legal-pages.md).

## Differences to angular-base

- **Look**: Trail theme (spruce ink on lichen grey-green, trail-marker yellow) with the font Overpass. `--brand` is the yellow, so `variant="brand"` is the yellow main button. `.page-container` is 81rem wide with 3rem padding from `md` up
- **Start page**: `shellLayout('full-bleed')`, the header navigation jumps to sections (`fragment`), the drawer waits for the sheet's `closed` before it scrolls. A route guard waits for the content with `settled()`
- **Texts from the backend**: the content is `Localized` (`{ de, en }`) and shown with the pipe `localized`, a language switch needs no request
- **Projects**: several screenshots per project in `app-ui-carousel`, the description is rich text shown with `app-ui-rich-text`. The editor takes an ordered list of screenshots (`ImagesField`, 1 to 10) and a rich-text editor per language. A new project is a draft (`Published` switch off), drafts carry a `Draft` badge on the start page for the admin, tags (e.g. "Work project") sit under the title in one of six fixed colours, see [Projects](../portfolio/web/portfolio.md#projects)
- **SEO**: title, description and preview image of the start page come from the `seo` section (`PageSeoImage`). `APP_NAME` is `Manuel Braun`
- **Legal pages**: rich text with `profile="page"`, so internal links go through the router
- **Config**: [config/app-config.json](../../apps/portfolio-web/config/app-config.json) with `apiBaseUrl` ending in `/api/v1`. `allowSignUp` must match `auth.signUpEnabled` of the API, `false` in production
- **DTOs**: media, contact, legal pages, users, auth and notes come from `@portfolio/contracts` and `@contracts`. The sections of the start page keep the hand-written `portfolio.dto.ts`, since their schemas are built by a helper that loses the types
