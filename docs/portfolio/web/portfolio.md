# Portfolio

The start page (`/`) shows content an admin writes in the editor (`/admin/portfolio`). Both read the same backend resource, the start page through the feature `portfolio`, the editor through the feature `portfolio-editor`. Neither knows the other, they share only the API layer.

## The content

`GET /portfolio` is public and answers with seven sections, each `null` until it has been created:

| Section    | Holds                                                         | Shown in                                   |
| ---------- | ------------------------------------------------------------- | ------------------------------------------ |
| `hero`     | Name, introduction, place and coordinates on the map          | `HeroSection`                              |
| `about`    | Heading, introduction, facts, portrait                        | `AboutSection`                             |
| `projects` | Heading, introduction, projects with screenshot, stack, links | `ProjectsSection`                          |
| `skills`   | Heading, introduction, signposts with skills and their points | `SkillsSection`                            |
| `contact`  | Heading and introduction above the contact form               | `ContactSection`                           |
| `settings` | Name, email, phone, address, GitHub and LinkedIn profile      | Contact channels                           |
| `seo`      | Title, description and preview image of the start page        | `<head>`, see [SEO](../../frontend/seo.md) |

The models are in [src/api/portfolio/portfolio.ts](../../../apps/portfolio-web/src/api/portfolio/portfolio.ts), a missing section is `undefined`. The limits of the backend are in `PORTFOLIO_LIMITS`, the forms validate against them.

- Without `?lang` every text comes in both languages as `Localized<T>` (`{ de, en }`). The app always loads both and picks the active language while rendering, see [Internationalization](../../frontend/i18n.md#texts-from-the-backend). A language switch therefore needs no request, and the editor works with the same models
- `GET /portfolio` is not wrapped, the writes answer with the section wrapped in its name (`{ hero }`)
- The logo reads only the name from `SITE_OWNER` ([site-owner.ts](../../../apps/portfolio-web/src/app/site-owner.ts)), the app shell knows no API. The legal pages come from the backend, see [Legal pages](legal-pages.md)

## The start page

[src/app/features/portfolio/](../../../apps/portfolio-web/src/app/features/portfolio)

- `PortfolioStore` loads the content. The route guard `loadPortfolio` waits for it on the first visit, so a `/#projects` link from another page finds its section. Later visits show what is loaded and refresh it in the background, so changes from the editor show up without a full reload
- `PortfolioHome` renders the content through `app-async-content` and leaves out every section that does not exist. Its SEO texts come from the `seo` section through `injectPageSeo()`, the route's own `title` and `description` apply until then
- Each section component takes its model as a required input. Texts go through `| localized`, UI texts such as button labels stay in the page scope `portfolioHome`
- Images are served by the backend (`GET /media/{id}`, public). `NgOptimizedImage` takes their `url`, `width` and `height` from the model

## The editor

[src/app/features/portfolio-editor/](../../../apps/portfolio-web/src/app/features/portfolio-editor)

`/admin/portfolio` is part of the admin area and behind its `adminGuard`: signed out it leads to the sign-in page, a user without admin rights lands on the start page. Admins reach it from the hub at `/admin`, see [Admin area](admin.md).

| Path                        | Page              | What it does                                                    |
| --------------------------- | ----------------- | --------------------------------------------------------------- |
| `/admin/portfolio`          | `SectionOverview` | A card per section with whether it exists yet                   |
| `/admin/portfolio/:section` | `SectionEditor`   | The form of one section. `canMatch` answers 404 for other names |

- `PortfolioEditorUseCase` combines the portfolio and the media API. `PortfolioEditorStore.save(name, value)` creates a section that does not exist yet (`POST`) and replaces an existing one (`PATCH`), then updates the loaded content with the answer
- Every section has a form component (`HeroForm`, `AboutForm`, …) with Signal Forms. The form model starts from the stored section through `linkedSignal` and follows it after a save
- Shared pieces: `LocalizedField` (German and English side by side), `ImageField`, `ListItemActions` (move up, move down, remove) and `SectionFormFooter` (failure, save button). The rules in [section-rules.ts](../../../apps/portfolio-web/src/app/features/portfolio-editor/presentation/section-form/section-rules.ts) cover required texts, lengths, URLs and lists
- Lists of plain strings (facts, points of a skill, stack, address) are a textarea with one entry per line. The mapper trims every entry and drops empty ones
- An optional text in both languages is either empty in both or filled in both. Saving leaves an empty optional field out on `POST` and sends `null` on `PATCH`, which removes it

### Images

A section points to an uploaded image by `{ id, alt }`. In the editor `ImageField` either uploads a file right away (`POST /media`, field `file`, JPEG/PNG/WebP/AVIF/GIF up to 10 MB) or opens `MediaPickerDialog` with the library (`GET /media`, loaded on first use). The section only points to the image once it is saved. The alt text is required in both languages as soon as an image is chosen.

A dialog does not see the providers of the feature routes, so the picker gets the list and its state as dialog data instead of injecting the store.

## Rules in short

- Content of the start page comes from `GET /portfolio`, nothing of it lives in the code or in the scope files
- Backend texts are `Localized` and rendered with `| localized`
- Writes to the portfolio live in `portfolio-editor`, the start page only reads
- A missing section is left out of the start page, never filled with placeholder text
