# CMS content

The API stores the editorial content of the start page (`/`, feature `portfolio` of the web app), so it can change without a deploy. Until now this content was static in the web app: texts in `portfolio-home/i18n/{de,en}.json`, projects in `projects.ts`, skills in `skill-groups.ts`, owner data in `SITE_OWNER`.

Four features implement it. All endpoint paths in this guide are under `/api/v1`: `GET /portfolio` is `GET /api/v1/portfolio`.

| Feature                                                           | Endpoints    | What it does                                                |
| ----------------------------------------------------------------- | ------------ | ----------------------------------------------------------- |
| [`portfolio`](../../../apps/portfolio-api/src/features/portfolio) | `/portfolio` | The page content, one singleton per section                 |
| [`media`](../../../apps/portfolio-api/src/features/media)         | `/media`     | Image uploads, served publicly                              |
| [`contact`](../../../apps/portfolio-api/src/features/contact)     | `/contact`   | The contact form: stores messages and forwards them by mail |
| [`legal`](../../../apps/portfolio-api/src/features/legal)         | `/legal`     | Imprint, privacy, accessibility and cookie policy as HTML   |

## Conventions

- `L<T>` is `{ de: T; en: T }`. Both languages are required.
- Arrays keep their order, the order in the array is the order on the page.
- Images are uploaded separately (`FormData`) and referenced by id. Width and height are stored, `NgOptimizedImage` needs them.
- UI texts (buttons, form labels, validation messages, navigation) stay in the app. Only editorial content is CMS content.

## Models

These are the shapes `GET /portfolio` returns. The zod schemas in [`portfolio.schemas.ts`](../../../packages/portfolio/contracts/src/portfolio.ts) are the source of truth, including the length limits.

```ts
type L<T = string> = { de: T; en: T };

interface Image {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: L; // required, accessibility
}

interface Hero {
  name: string;
  description: L;
  mapPlace?: L; // decorative label of the topo map
  mapCoordinates?: string;
}

interface About {
  headline: L;
  description: L;
  facts: L<string[]>;
  image: Image;
}

interface Project {
  title: string;
  description: L;
  stack: string[];
  githubUrl?: string; // without one the code is not public
  testUrl?: string; // without one there is no live demo
  image: Image;
}

interface Projects {
  headline: L;
  description: L;
  items: Project[];
}

interface Skill {
  name: L;
  points: L<string[]>;
}

interface SkillSet {
  title: L;
  skills: Skill[];
}

interface Skills {
  headline: L;
  description: L;
  sets: SkillSet[];
}

interface Contact {
  headline: L;
  description: L;
}

/** Replaces `SITE_OWNER`. */
interface Settings {
  name: string;
  email: string;
  phone?: string;
  address?: string[];
  profiles: { github: string; linkedin: string };
}

/** Title and meta description of the start page. */
interface Seo {
  title: L;
  description: L;
  ogImage?: Image;
}
```

URLs (`githubUrl`, `testUrl`, `profiles.*`) must be `http` or `https`.

## Reading the page

`GET /portfolio` is public and returns the complete page: `{ hero, about, projects, skills, contact, settings, seo }`. A section is `null` until it has been created.

- Without a query, every `L` comes in both languages. This is what the editor uses.
- With `?lang=de` or `?lang=en`, every `L` is resolved to that language: `"headline": "Projekte"` instead of `"headline": { "de": "Projekte", "en": "Projects" }`. Any other value is a 400.

## Changing a section

Every section has its own write endpoints. They are admin only (session cookie, 401 without, 403 for a normal user) and the section is a singleton.

| Section  | Write endpoints                      |
| -------- | ------------------------------------ |
| hero     | `POST` / `PATCH /portfolio/hero`     |
| about    | `POST` / `PATCH /portfolio/about`    |
| projects | `POST` / `PATCH /portfolio/projects` |
| skills   | `POST` / `PATCH /portfolio/skills`   |
| contact  | `POST` / `PATCH /portfolio/contact`  |
| settings | `POST` / `PATCH /portfolio/settings` |
| seo      | `POST` / `PATCH /portfolio/seo`      |

- **`POST`** creates the section with all required fields. 409 if it already exists.
- **`PATCH`** changes only the sent top-level fields, at least one. Each sent field replaces the stored value as a whole: an `L`, an array (send the full, reordered or shortened list), or `profiles`. 404 if the section was not created yet.
- **`null` removes an optional field** in a `PATCH`, for example `{ "mapPlace": null }`. Required fields cannot be `null`.
- Both answer with the section in both languages: `{ "hero": { … } }`.

### Images in the content

In a request, an image is a reference to an uploaded image plus its alt text:

```json
{ "id": "7f0c…", "alt": { "de": "Porträt von Manuel Braun", "en": "Portrait of Manuel Braun" } }
```

The alt text belongs to the place where the image is used, not to the upload. An unknown id is a 400. In responses the reference is resolved to the full `Image` with `url`, `width` and `height`.

So adding a project with a new screenshot takes two calls: upload the file, then `PATCH /portfolio/projects` with the new `items` list that references the returned id.

## Media

| Endpoint             | Access | What it does                                      |
| -------------------- | ------ | ------------------------------------------------- |
| `GET /media`         | admin  | List uploaded images, newest first                |
| `POST /media`        | admin  | Upload one image in the `file` field (`FormData`) |
| `GET /media/{id}`    | public | The image file                                    |
| `DELETE /media/{id}` | admin  | Delete an image                                   |

```ts
const form = new FormData();
form.append('file', file);
const { media } = await fetch(`${api}/media`, {
  method: 'POST',
  body: form,
  credentials: 'include',
}).then((r) => r.json());
// media: { id, url, width, height, createdAt }
```

Uploads go through the same processing as note images ([`src/shared/images.ts`](../../../packages/server/core/src/images.ts)): the format is detected from the bytes (JPEG, PNG, WebP, AVIF, GIF; SVG is rejected), the image is scaled down to `uploads.maxImageWidth` and stored as WebP, metadata is dropped. Files over `uploads.maxFileSizeMb` are a 413.

`url` is `{publicUrl}/api/v1/media/{id}`, built from the `publicUrl` setting. The file is public, because every visitor of the start page sees it, and is cached for a year (`immutable`): an image never changes under its id. To replace an image, upload a new one and change the reference.

`DELETE` is refused with 409 while a section still references the image, so the page never points to a missing file.

## Contact messages

The contact form of the web app sends `POST /contact` with `{ name, email, message }`. The endpoint is public, rate limited per IP (`rateLimit.contactMaxRequests` per `rateLimit.contactWindowMinutes`, then 429) and answers 204 without a body.

The message is stored first and then forwarded by mail to `mail.to`, with the visitor's address as reply-to, so answering the mail answers the visitor. If the mail cannot be sent, the error is logged and the visitor still gets 204: the message is in the inbox either way. Mail settings are in [Configuration](configuration.md#mail).

| Endpoint                        | Purpose                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `GET /contact/messages`         | List, newest first (`id`, `name`, `email`, `message`, `createdAt`, `read`) |
| `PATCH /contact/messages/{id}`  | `{ "read": true }` marks as read, `false` as unread                        |
| `DELETE /contact/messages/{id}` | Delete                                                                     |

All three are admin only.

## Legal pages

Imprint, privacy policy, accessibility statement and cookie policy are CMS content too. Unlike the sections they are stored as HTML, one fragment per language, and the public endpoint returns that fragment directly instead of JSON.

| Endpoint              | Access | What it does                                                    |
| --------------------- | ------ | --------------------------------------------------------------- |
| `GET /legal/{page}`   | public | The page as an HTML fragment (`text/html`), `?lang=de` or `en`  |
| `GET /legal`          | admin  | Every page in both languages, for the editor                    |
| `PATCH /legal/{page}` | admin  | Change a page, body `{ "de": "<h1>…", "en": "…" }`, one or both |

`{page}` is `imprint`, `privacy`, `accessibility` or `cookies`.

- **`GET /legal/{page}`** answers with the fragment only, no `<html>`, `<head>` or `<body>`. `lang` defaults to `de`, any other value than `de` or `en` is a 400 (as JSON). `Content-Language` names the language. 404 until the page has been created.
- **`GET /legal`** returns `{ imprint, privacy, accessibility, cookies }`, each `{ de, en, updatedAt }` or `null`.
- **`PATCH /legal/{page}`** takes `de`, `en` or both, at least one. Each sent language replaces its stored HTML as a whole, the other one stays. With both languages a page that does not exist yet is created; with one it is a 404. It answers with the whole page: `{ "<page>": { de, en, updatedAt } }`.

The HTML is sanitized before it is stored ([`legal.sanitize.ts`](../../../apps/portfolio-api/src/features/legal/legal.sanitize.ts)) to the formats of the rich text editor in the web app: `p`, `br`, `h2`, `h3`, `ul`, `ol`, `li`, `blockquote`, `strong`, `em` and `a` with an `href` that is `http`, `https`, `mailto`, `tel` or relative (`/privacy`, `/#contact`). Every other tag loses its markup but keeps its text, every other attribute (classes, styles, event handlers) is removed. The page heading (`h1`) is not part of the content, the web app renders it; the content starts with `h2`. A postal address is a paragraph with line breaks.

The pages hold the owner's contact details as text; they do not read them from `Settings`. Change both when the address changes.

In the web app (`portfolio-web`, feature `legal`) the page loads the fragment as text with `?lang=` of the active language and renders it with `<app-ui-rich-text profile="page">` below its own `h1`. Relative links in the content go through the router. Admins edit the pages under `/admin/legal` with the same rich text editor, so the stored HTML never holds more than the editor can show.

## Seed

The initial content is in [`seed/portfolio.json`](../../../apps/portfolio-api/seed/portfolio.json) with the images in [`seed/images/`](../../../apps/portfolio-api/seed/images), the legal pages in [`seed/legal/`](../../../apps/portfolio-api/seed/legal) as `<page>.<lang>.html`. It was converted once from the web app (`portfolio-home/i18n/de.json`, `en.json`, `projects.ts`, `skill-groups.ts`, `site-owner.ts`, and the `seo.imageAlt` text for the og image). In that file an image is `{ "file": "images/portrait.webp", "alt": { … } }`.

```bash
pnpm nx run portfolio-api:db:seed   # locally, after db:migrate
node dist/scripts/seed.js     # in the container
```

The script uploads the images and creates every section and legal page that does not exist yet. Existing ones are left alone, so running it again is safe and never overwrites content changed through the API. To re-import one, delete its row from `portfolio_sections` or `legal_pages` first.

Taken over as is, to be edited through the API:

- Each skill has one `points` entry, the former `use` text.
- The contact description is plain text; the inline LinkedIn and GitHub links went away, the profiles come from `Settings`.
- The og image is stored as WebP like every upload.

## Additions beyond the first list

- `Image.alt` per language, so every image stays accessible.
- `Settings` replaces `SITE_OWNER`. The profile links of the contact section come from it. `Hero.name` stays a field of its own.
- `Seo` makes the title and description of the start page editable, today they are `portfolioHome.title` and `portfolioHome.description`.
- Contact inbox, because the form already sends messages and nobody can read them yet.
- `githubUrl` and `testUrl` are optional. The project card hides the button when a URL is missing (today `liveUrl` is required).
- `Skill.points` replaces the single `use` string, so the skill card shows a list.
- The contact description is plain text.
- `GET /media` lists the uploads, so the editor can pick and clean them up.
- Legal pages, including a new cookie policy, as editable HTML. The seed carries the former texts of the app plus the postal address; there is no phone number, the contact form is the second way to get in touch that § 5 DDG asks for.

## Not part of the CMS

- Drafts and revisions are left for later.

## Storage

Each section is one row in `portfolio_sections` (`key`, `content` as `jsonb`, `updatedAt`). The content is validated by its zod schema on every write and stored with image references, not resolved images. A `PATCH` is merged in the database (`content || patch`, then nulls stripped), so two concurrent changes of different fields both survive.
