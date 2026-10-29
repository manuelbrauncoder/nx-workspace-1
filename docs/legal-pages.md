# Legal pages

Every public site in Germany needs an imprint and a privacy policy. The base ships both plus an accessibility statement, linked from the footer of every page.

| Page                    | Path                | Component                                                                              |
| ----------------------- | ------------------- | -------------------------------------------------------------------------------------- |
| Imprint                 | `/impressum`        | [Imprint](../src/app/features/legal/presentation/imprint/imprint.ts)                   |
| Privacy policy          | `/datenschutz`      | [Privacy](../src/app/features/legal/presentation/privacy/privacy.ts)                   |
| Accessibility statement | `/barrierefreiheit` | [Accessibility](../src/app/features/legal/presentation/accessibility/accessibility.ts) |

The paths are German in both languages. The language of a page comes from the cookie, not from the URL, see [Internationalization](i18n.md).

## The site owner

Name and contact details stand in one place:

[src/app/core/site-owner.ts](../src/app/core/site-owner.ts)

```ts
export const SITE_OWNER: SiteOwner = {
  name: 'Manuel Braun',
  email: 'mail@manuel-braun.net',
};
```

`address` (the lines of the postal address) and `phone` are optional. The pages show them as soon as they are set. It lives in `core`, so another feature, e.g. a contact page, can use it too.

## What a project has to fill in

The texts only describe what the base itself does. They are a starting point, not legal advice.

- **`SITE_OWNER`**: name, mail address, postal address. An imprint without a postal address is incomplete for a business site (§ 5 DDG)
- **Privacy policy**: the hosting provider and the retention period of the server logs are placeholders in square brackets. Every addition that processes personal data needs a section of its own: a contact form, analytics, embedded maps or videos, fonts from another server
- **Accessibility statement**: the known limitations are a placeholder. Only claim what was checked
- **The date** at the end of the privacy policy and the accessibility statement (`updated`)

The texts are in `i18n/de.json` and `i18n/en.json` next to each page. A new section of the privacy policy is a `heading` and a `text` there and one entry in `sections` of `Privacy`.

## Search engines

The three routes carry `routeSeo({ index: false })`, so they are reachable but stay out of search results and out of the sitemap. See [SEO](seo.md).

## Footer

The links come from `APP_FOOTER_ITEMS` in [src/app/layout/app-nav-items.ts](../src/app/layout/app-nav-items.ts), their labels from `layout.footer.*` in the shared scope.
