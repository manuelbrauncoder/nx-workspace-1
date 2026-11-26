# Portfolio

The start page (`/`) shows content an admin writes in the editor (`/admin/portfolio`). Both read the same backend resource, the start page through the feature `portfolio`, the editor through the feature `portfolio-editor`. Neither knows the other, they share only the API layer.

## The content

`GET /portfolio` is public and answers with seven sections, each `null` until it has been created:

| Section    | Holds                                                          | Shown in                                   |
| ---------- | -------------------------------------------------------------- | ------------------------------------------ |
| `hero`     | Name and role (`roleAccent`, `role`)                           | `HeroSection`                              |
| `about`    | Heading, introduction, facts, portrait                         | `AboutSection`                             |
| `projects` | Heading, introduction, projects with screenshots, stack, links | `ProjectsSection`                          |
| `skills`   | Heading, introduction, skill sets with skills and their points | `SkillsSection`                            |
| `contact`  | Heading and introduction above the contact form                | `ContactSection`                           |
| `settings` | Email, GitHub and LinkedIn profile                             | Contact channels                           |
| `seo`      | Title, description and preview image of the start page         | `<head>`, see [SEO](../../frontend/seo.md) |

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
- `ProjectCard` shows the screenshots of a project in `app-ui-carousel` with `controls="overlay"`, one at a time, in the order of the editor, always in the same 16:10 frame with `object-fit: contain`. The first one is the cover. The description is rich text from the API, shown with `app-ui-rich-text`, so it may hold lists, headings and links as the editor allows them. Its tags sit under the title as a list of `appUiBadge variant="tinted"`, each with the class `project-tag--<color>` from `styles/base/_tags.scss`, which sets the colours from the tokens `--tag-<color>-background`/`-foreground` of the theme. Without tags there is no list. A draft (`published: false`) shows a `Draft` badge with the hint "Only visible to you". Visitors never get a draft, so the card does no auth check

## The look

Light by default: `DEFAULT_THEME_MODE` is `light` in `app.config.ts`, and the inline script in `index.html` falls back to light too, so a visitor without a stored choice sees the day palette, also with a system in dark mode. Dark stays selectable in the settings menu and the drawer. The language falls back to English (`provideI18n({ ..., defaultLanguage: 'en' })`): a German browser gets German, any other English, a chosen language always wins. The pages sit on a plain surface, no gradient, glass or blur. The palettes are in [themes/](../../../apps/portfolio-web/src/styles/themes): near black `#07080d` or warm paper `#f3f0ea`, one accent `--brand` (amber, 5.5:1 on the paper), small amber text and links use the darker `--link`. Raised panels use `--surface` with a hairline. Inter Tight sets text and headings (light 300 on the start page), Instrument Serif in italics only single accent words, JetBrains Mono stays for code. The fonts are self-hosted in `public/fonts`.

- **Header.** Transparent over the top of the page, solid with a hairline once it scrolls more than 40px. The logo is a flat tile with `</>` in `--brand`, the same colour as the accent word of the hero: deep amber with a white sign in light, bright amber with a dark sign in dark. The favicon follows the theme too: `App` swaps `favicon.svg` for `favicon-dark.svg` in dark. The static icons (`favicon.ico`, the PNGs, `apple-touch-icon.png`, the manifest) show the light tile, the default theme. Below `md` a menu button (burger icon) opens the drawer from the right, full width, with the four sections, the account, language and theme at its bottom. From `md` the header shows the links and the settings menu
- **Hero.** The name (`hero.name` from the CMS) over its role from the CMS, e.g. "_Frontend_ Developer" (`hero.roleAccent` in the italic serif in amber, then `hero.role`), two buttons and the scroll arrow. [HeroLens](../../../apps/portfolio-web/src/app/features/portfolio/presentation/hero-lens) puts a clear glass sphere (it blurs the text behind it) over the headline with a copy of it, magnified 1.4 times (1.3 below 640px). The copy is `aria-hidden` and `inert`, the `h1` stays the only heading. The sphere follows the mouse only while the pointer is over the box of the headline. Once the pointer leaves it (towards the header, the buttons or the side), the sphere glides back onto the headline and wanders across it by itself, as it does after 4.5 seconds without movement and on a touch screen. It runs only while the hero is on screen and at most at 60 frames a second. With reduced motion it rests on the headline
- **Sections.** Separated by hairlines. About lists its facts with amber dots. Each project opens with its name and tags, then the screenshot carousel and the text. On a phone a hairline separates the projects, from `md` screenshots and text sit half and half and alternate sides. The stack below the description is quiet mono text. Skills are columns under a rule, one to four in a row. Contact lists its channels as rows with an arrow. The form sits right on the page while it is stacked below the text, from `lg` next to the text it is a raised panel
- **Motion.** The hero lines fade and rise once on load, one after the other. Headings, cards and rows further down rise into place the first time they scroll into view: the directive `appReveal` ([reveal.ts](../../../apps/portfolio-web/src/app/features/portfolio/presentation/reveal/reveal.ts)) hides them only in the browser and only below the first screen, so the server renders everything visible. Hover effects only apply under `(hover: hover)`: colour and surface change, arrows nudge 2 to 3px, nothing jumps or scales. With reduced motion nothing enters, rises or wanders. The only endless motion is the wandering sphere, it is intended. `prefers-reduced-motion` is the only off switch, there is no pause control

## The editor

[src/app/features/portfolio-editor/](../../../apps/portfolio-web/src/app/features/portfolio-editor)

`/admin/portfolio` is part of the admin area and behind its `adminGuard`: signed out it leads to the sign-in page, a user without admin rights lands on the start page. Admins reach it from the hub at `/admin`, see [Admin area](admin.md).

| Path                        | Page              | What it does                                                    |
| --------------------------- | ----------------- | --------------------------------------------------------------- |
| `/admin/portfolio`          | `SectionOverview` | A card per section with whether it exists yet                   |
| `/admin/portfolio/:section` | `SectionEditor`   | The form of one section. `canMatch` answers 404 for other names |

- `PortfolioEditorUseCase` combines the portfolio and the media API. `PortfolioEditorStore.save(name, value)` creates a section that does not exist yet (`POST`) and replaces an existing one (`PATCH`), then updates the loaded content with the answer
- Every section has a form component (`HeroForm`, `AboutForm`, …) with Signal Forms. The form model starts from the stored section through `linkedSignal` and follows it after a save
- Shared pieces: `LocalizedField` (German and English side by side, with `richText` one rich-text editor per language; each field carries its language as `lang` and points at the description of the group), `ImageField`, `ImagesField` (a sortable list of images), `ListItemActions` (move up, move down, remove) and `SectionFormFooter` (failure, save button). The rules in [section-rules.ts](../../../apps/portfolio-web/src/app/features/portfolio-editor/presentation/section-form/section-rules.ts) cover required texts, lengths, URLs and lists
- Lists of plain strings (facts, points of a skill, stack, address) are a textarea with one entry per line. The mapper trims every entry and drops empty ones
- Saving leaves an empty optional field out on `POST` and sends `null` on `PATCH`, which removes it

### Images

A section points to an uploaded image by `{ id, alt }`. In the editor `ImageField` either uploads a file right away (`POST /media`, field `file`, JPEG/PNG/WebP/AVIF/GIF up to 10 MB) or opens `MediaPickerDialog` with the library (`GET /media`, loaded on first use). The section only points to the image once it is saved. The alt text is required in both languages as soon as an image is chosen.

A dialog does not see the providers of the feature routes, so the picker gets the list and its state as dialog data instead of injecting the store.

### Projects

The projects section is a list of projects in the order of the form, and the form saves it as a whole (`PATCH /portfolio/projects`). Each project has:

- A title, a stack (one technology per line) and the optional GitHub and test links
- A `Published` switch (`app-form-switch`). A new project starts with it off, so it is a draft until it is switched on. The legend of a draft shows a `Draft` badge. Saved drafts are sent with `published: false`, and only the admin sees them on the start page
- Tags, 0 to `PORTFOLIO_LIMITS.projectTags` (5), each in its own fieldset: the text per language (`LocalizedField`, up to `PORTFOLIO_LIMITS.projectTag` characters) and a colour (`app-form-select` over `PROJECT_TAG_COLORS`), with a preview of the badge. Tags move up or down or are removed without asking, the focus then goes to the project's add button
- A description per language as rich text (`LocalizedField` with `richText`, one `app-form-rich-text` for German and one for English). It takes the formats of the notes, so links may point to absolute `http`, `https` and `mailto` addresses but not into the site. The limit is `PORTFOLIO_LIMITS.projectDescription` (10,000 characters including the markup)
- Screenshots in `ImagesField`: 1 to `PORTFOLIO_LIMITS.projectImages` (10) images, each with its own `ImageField` and alt text in both languages. The first one is the cover, the rest follow in the carousel. Each image can move up or down or be removed, a new one starts empty, and the add button turns off at 10. A project without any image is a validation error (`sectionEditor.validation.imagesRequired`)

On save each image becomes a `{ id, alt }` reference, see [Images](#images). The array keeps the order of the list, so the order in the editor is the order on the start page.

## Rules in short

- Content of the start page comes from `GET /portfolio`, nothing of it lives in the code or in the scope files
- Backend texts are `Localized` and rendered with `| localized`
- Writes to the portfolio live in `portfolio-editor`, the start page only reads
- Drafts are filtered by the API, not by the web app: the start page shows what `GET /portfolio` returns
- A missing section is left out of the start page, never filled with placeholder text
