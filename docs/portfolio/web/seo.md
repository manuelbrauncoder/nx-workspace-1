# SEO

Every page is rendered on the server, so a crawler receives the finished HTML. This doc covers what goes into the `<head>` of that HTML, which HTTP status a page answers with, and the two files crawlers ask for: `robots.txt` and `sitemap.xml`.

The code lives in [src/app/core/seo/](../src/app/core/seo/). Nothing outside of it writes the title or a meta tag.

## What every page gets

`SeoService` writes these tags after every navigation, on the server and in the browser, and again when the language changes:

| Tag                                    | Value                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `<title>`                              | `<page title> \| portfolio-web`. The name comes from `APP_NAME`          |
| `meta description`                     | Description of the route, else the default `seo.defaultDescription`      |
| `meta robots`                          | `index, follow` or `noindex, nofollow`, see [Indexing](#indexing)        |
| `link rel="canonical"`                 | `siteUrl` plus the path, without query and fragment                      |
| `og:title`, `og:description`, `og:url` | Same values as above                                                     |
| `og:type`, `og:site_name`, `og:locale` | `website`, the app name, the active locale                               |
| `og:image` with width, height and alt  | [public/og-image.png](../public/og-image.png) (1200×630) as absolute URL |
| `twitter:card`                         | `summary_large_image`                                                    |
| `twitter:image`                        | Same image as `og:image`                                                 |

Absolute URLs need the public address of the app. It is not part of the build, it comes from `siteUrl` in the [runtime config](api-and-config.md#runtime-config).

## Settings of a route

The title stays in the `title` of the route and is a translation key. Everything else goes through `routeSeo()`:

[src/app/features/notes/notes.routes.ts](../src/app/features/notes/notes.routes.ts)

```ts
{
  path: '',
  pathMatch: 'full',
  title: 'notesList.title',
  // Notes are private, so none of these pages belongs into a search result.
  data: routeSeo({ index: false }),
  canActivate: [loadI18nScope(notesListI18n)],
  loadComponent: ...
},
```

A public page names its description instead: `data: routeSeo({ description: 'productsList.description' })`.

| Setting       | Meaning                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `description` | Translation key of the meta description. Lives in the scope of the page |
| `index`       | `false` keeps the page out of search engines                            |
| `image`       | Path of another preview image for shared links, e.g. `/og-notes.png`    |

- A child route takes over the settings of its parents and replaces single values. The showcase sets `index: false` once on its parent route
- A page with public content gets a `description`. A form, an internal page or anything behind a login gets `index: false`
- `SeoTitleStrategy` is the `TitleStrategy` of the router. It collects title and settings and hands them to `SeoService`

## Meta data from loaded data

A page that shows one entry should carry the title of that entry, not a generic one. `injectPageSeo()` takes a function that returns title and description once the data is there:

[src/app/features/notes/presentation/note-detail/note-detail.ts](../src/app/features/notes/presentation/note-detail/note-detail.ts)

```ts
constructor() {
  effect(() => this._store.select(this.id()));
  injectPageSeo(() => {
    const note = this._store.selected();
    return note && { title: note.title, description: toMetaDescription(note.description) };
  });
}
```

- While the function returns `undefined`, and after the page was left, the settings of the route apply
- The texts are final, not translation keys. An empty description falls back to the one of the route
- `toMetaDescription()` turns rich text into plain text on one line and cuts it at about 160 characters
- The data is loaded during server rendering, so the tags are part of the delivered HTML
- `image` is a `PageSeoImage` with an absolute `url`, `width`, `height` and `alt`, e.g. an image on the backend. The start page takes title, description and preview image from the `seo` section of its content, see [Portfolio](portfolio.md)

## Indexing

Two things decide whether a page may be indexed:

- `allowIndexing` in the runtime config. `false` on every deployment except production, so staging never shows up in a search result. Then every page gets `noindex, nofollow` and `robots.txt` locks out all crawlers
- `index: false` on the route, for single pages of an indexable deployment

## HTTP status

Without help every server-rendered page answers with 200, also the one that says "not found". Search engines then index an error page.

- The `**` route in [src/app/app.routes.ts](../src/app/app.routes.ts) renders [NotFound](../src/app/layout/not-found/not-found.ts), which sets status 404
- `app-async-content` passes the status of a `Failure` on to the response. `/notes/<unknown id>` therefore answers with 404, a page whose backend is down with 503. Pages do not have to do anything for it
- Anything else sets the status with `injectResponseStatus()` from [src/app/core/http/response-status.ts](../src/app/core/http/response-status.ts). It does nothing in the browser

```ts
private readonly _setResponseStatus = injectResponseStatus();
// ...
this._setResponseStatus(410);
```

## robots.txt and sitemap.xml

Both are generated by the Express server in [src/server/seo-routes.ts](../src/server/seo-routes.ts), since they contain the public URL.

- `/robots.txt` allows everything and names the sitemap, or disallows everything when `allowIndexing` is `false`
- `/sitemap.xml` lists the pages that [src/server.ts](../src/server.ts) passes in. The list is empty for now: notes are private, the other pages are not meant to be indexed

A feature with public pages adds its entries in `server.ts`:

```ts
app.use(seoRoutes(serverConfig, () => [...productsSitemapEntries()]));
```

The function is asked on every request. Entries that depend on data, e.g. one page per product, come from a request to the backend.

## Icons and manifest

The files are in [public/](../public/) and linked in [src/index.html](../src/index.html): `favicon.ico`, `logo.svg`, `apple-touch-icon.png` and `manifest.webmanifest`, which refers to `logo-512.png`. Their names carry no hash, so the server delivers them with a cache time of one hour instead of one year.

## Not included

- A language in the URL (`/de/...`, `/en/...`) with `hreflang` links. The language comes from a cookie and `Accept-Language`, both languages share one URL. Crawlers send neither, so they see German only
- Structured data (JSON-LD)
- Prerendering of static routes

## Rules in short

- Title and meta tags are written by `SeoService` only. No `Title` or `Meta` in features, `shared` or the layout
- A public page has `routeSeo({ description })`, any other page `routeSeo({ index: false })`
- Meta data from loaded data goes through `injectPageSeo()`
- A page that shows "not found" answers with 404
- `allowIndexing` is `true` in production only
- New public pages are added to the sitemap in `server.ts`
