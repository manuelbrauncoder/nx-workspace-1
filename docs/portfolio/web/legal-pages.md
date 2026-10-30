# Legal pages

Every public site in Germany needs an imprint and a privacy policy. The app has four legal pages, linked from the footer of every page. Their content comes from the backend, so it changes without a deploy.

| Page                    | Path             | Backend                    |
| ----------------------- | ---------------- | -------------------------- |
| Imprint                 | `/imprint`       | `GET /legal/imprint`       |
| Privacy policy          | `/privacy`       | `GET /legal/privacy`       |
| Accessibility statement | `/accessibility` | `GET /legal/accessibility` |
| Cookie policy           | `/cookies`       | `GET /legal/cookies`       |

The paths are the same in both languages. The language of a page comes from the cookie, not from the URL, see [Internationalization](i18n.md).

## How a page is shown

[src/app/features/legal/](../src/app/features/legal/)

- One component, `LegalPage`, serves all four routes. Each route names its page in `data: { page }`, which `withComponentInputBinding()` binds to the input `page`
- The heading (`h1`) and the route title come from the app (scope `legalPage`), the content from the backend. It starts with the first `h2`
- `LegalStore` loads the page through [src/api/legal](../src/api/legal/) as text: `GET /legal/<page>?lang=de|en` answers with a finished HTML fragment, not with JSON. The active language is part of the request, so a language switch loads the page again
- The content is rendered by `<app-ui-rich-text profile="page">`, see [UI components](ui-components.md#rich-text). The profile `page` allows links within the site (`/privacy`, `/#contact`) and `tel:` links. A plain click on a link within the site goes through the router
- A page that was not created yet answers with 404, `app-async-content` shows it and sets the status

## Editing

The pages are edited under `/admin/legal` (feature `legal-editor`, see [Admin area](admin.md#legal-pages)) with the same rich text editor as the notes, in the profile `page`. What the editor cannot show is not stored: the backend reduces the HTML to the same formats (`p`, `br`, `h2`, `h3`, lists, quotes, bold, italic, links).

- A postal address is a paragraph with line breaks (Shift+Enter in the editor)
- The texts are a starting point, not legal advice. The privacy policy still has placeholders in square brackets for the hosting provider and the retention period of the server logs, the accessibility statement one for the known limitations
- Every addition that processes personal data needs a section of its own in the privacy policy: analytics, embedded maps or videos, fonts from another server

The initial content comes from the seed of the backend (`seed/legal/` in `portfolio-api`).

## The site owner

[src/app/core/site-owner.ts](../src/app/core/site-owner.ts) holds only the name shown by the logo. Contact details live in the backend: in the legal pages and in the `settings` section of the start page.

## Search engines

The routes carry `routeSeo({ index: false })`, so they are reachable but stay out of search results and out of the sitemap. See [SEO](seo.md).

## Footer

The links come from `APP_FOOTER_ITEMS` in [src/app/layout/app-nav-items.ts](../src/app/layout/app-nav-items.ts), their labels from `layout.footer.*` in the shared scope.
