<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain
- Private methods and properties start with an underscore: `private readonly _me = signal(...)` next to the public `readonly me`. ESLint enforces it (`@typescript-eslint/naming-convention`)
- `protected` is for class inheritance only (e.g. `Log` and its subclasses). Everything else is `private` or public

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Members that only the class and its template use are `private` (`_saving`, `_store`). Templates can read private members since Angular v22.2. Inputs, outputs and models stay public
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Never use inline `template` or `styles`. Every component lives in its own folder with three files: `name.ts`, `name.html`, `name.scss`
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- Do NOT import `CommonModule`, import only the directives and pipes the template uses, such as `AsyncPipe` or `DatePipe`
- When using external templates/styles, use paths relative to the component TS file.

## Styling

- Struktur pro App: `src/styles/tailwind.css` (nur Tailwind + Spartan-Preset, `@source` auf die App und `packages/shared`, in `project.json` zuerst), `src/styles/styles.scss` (Entry, nur `@use`), dazu `themes/` und `base/_fonts.scss` der App
- Geteiltes SCSS liegt in der Lib `packages/shared/styles/` (`abstracts/`, `base/`, `layout/`) und wird als `styles/...` eingebunden. Farben, Radius und Schriften bleiben in der App, weil sie zur Marke und zum Spartan-Style gehören
- Bis ca. 3 Tailwind-Klassen im Template, darüber oder bei Zuständen/Varianten eigenes `*.scss` an der Komponente
- SCSS nutzt nur Theme-Tokens (`var(--background)`, `var(--primary)`), kein `@apply`, keine hartcodierten Farben
- Globales SCSS in `@layer base` bzw. `@layer components`, damit Tailwind-Utilities es überschreiben können
- Light/Dark: Tokens in `themes/_light.scss` und `themes/_dark.scss` (`:root.dark`) der App. Neue Tokens in beiden definieren und in `tailwind.css` per `@theme inline` freigeben. Umschalten über `ThemeService` (`packages/shared/core/src/theme/`)
- In Komponenten-SCSS Helfer via `@use 'styles/abstracts' as *;` (Include-Path `packages/shared`)

## Architektur

Nx-Workspace mit zwei Seiten: Angular-Apps (`apps/angular-base`, Libs in `packages/shared/`) und API-Apps (`apps/express-api-base`, Libs in `packages/server/`, siehe Abschnitt „API-Apps“). Beide teilen das Wire-Format über `packages/contracts`. Das Portfolio (`apps/portfolio-web`, `apps/portfolio-api`, `packages/portfolio/contracts`), Dartomat (`apps/dartomat-web`, `apps/dartomat-api`, `packages/dartomat/contracts`) und Vyte (`apps/vyte-web`, `apps/vyte-api`, `packages/vyte/contracts`) sind genauso gebaut, Details in `docs/apps/`, `docs/portfolio/` und `docs/vyte/`. Tasks laufen immer über Nx (`pnpm nx …`). Innerhalb einer App feature-basierte Clean Architecture, Abhängigkeiten zeigen nur in eine Richtung: `presentation → application → domain → api`.

Die Grenzen erzwingt ESLint an zwei Stellen: zwischen Projekten über Nx-Tags (`@nx/enforce-module-boundaries` in der Root-`eslint.config.mjs`), innerhalb der App über `no-restricted-imports` in `apps/angular-base/eslint.config.mjs`.

| Tag             | Projekte                     | Darf abhängen von                                  |
| --------------- | ---------------------------- | -------------------------------------------------- |
| `type:app`      | `angular-base`               | `type:ui`, `type:core`, `type:styles`              |
| `type:ui`       | `ui`                         | `type:ui`, `type:core`, `type:helm`, `type:styles` |
| `type:core`     | `core`                       | `type:core`                                        |
| `type:helm`     | `helm-vega`, …               | `type:helm`                                        |
| `type:styles`   | `styles`                     | `type:styles`                                      |
| `type:contract` | `contracts`                  | `type:contract`, von npm nur `zod`                 |
| `type:api-app`  | `express-api-base`, …        | `type:server`, `type:contract`                     |
| `type:server`   | `server-core`, `server-auth` | `type:server`, `type:contract`                     |

Zweites Tag pro Projekt ist der Scope: `scope:shared` (alle Libs in `packages/shared`, `packages/server`, `packages/contracts`) darf nur von `scope:shared` abhängen, `scope:base` (angular-base, express-api-base) und `scope:portfolio` (portfolio-web, portfolio-api, portfolio-contracts) und `scope:dartomat` (dartomat-web, dartomat-api, dartomat-contracts) und `scope:vyte` (vyte-web, vyte-api, vyte-contracts) jeweils von sich selbst und `scope:shared`. Produkte importieren sich nie gegenseitig.

`type:app` und `type:ui` dürfen zusätzlich von `type:contract` abhängen. Browser- und Server-Projekte importieren sich nie gegenseitig.

Ausführliche Erklärungen mit Begründung und Beispielen stehen in `docs/` (Einstieg: `docs/README.md`, lokaler Start in `README.md`). Ändert sich eine Regel hier, das passende Doc mit anpassen.

- `packages/shared/core/src/` (Lib `core`, Alias `@core/*`): App-weite Infrastruktur (Runtime-Config, HTTP-Fehlerbehandlung, i18n, SEO, Theme, Test-Setup). Kennt weder Apps noch `ui` noch die UI-Library. Enthält keine App-spezifischen Werte: den App-Namen setzt jede App über den Token `APP_NAME` in `app.config.ts`
- `packages/shared/ui/src/` (Lib `ui`, Alias `@shared/*`): UI-Wrapper, Form-Controls, `app-async-content`, `app-failure-alert`, Theme- und Language-Toggle und deren Texte. Kennt keine Apps
- `packages/shared/helm-<style>/` (Alias `@spartan-ng/helm/*`): von der Spartan-CLI erzeugte Komponenten, eine Lib pro Spartan-Style, heute nur `helm-vega`. Generierter Code, Prettier und ESLint lassen ihn aus
- `packages/shared/styles/` (Lib `styles`): geteiltes globales SCSS
- `apps/angular-base/`: die App mit Features, Layout, API-Layer, Themes, `public/`, `config/` und eigenem `Dockerfile`. Features und API-Layer werden Libs, sobald eine zweite App sie braucht. `@features/*` und `@api/*` zeigen per `${configDir}` in `tsconfig.base.json` auf die App, die sie importiert. So nutzen beide Angular-Apps dieselben Aliase für ihre eigenen Ordner
- Innerhalb einer Lib relative Imports, Nx meldet einen Alias, der in die eigene Lib zeigt
- `apps/angular-base/src/app/layout/`: die `AppShell` mit Header, `<main>` samt `<router-outlet>`, Footer und Drawer für Mobile. Sie ist die Eltern-Route aller Seiten in `app.routes.ts`, eine Route ohne Rahmen (z. B. Login im Vollbild) steht daneben. Kennt weder Features noch `apps/angular-base/src/api`, einzige Ausnahme ist `@features/auth/public-api` für das Account-Menü im Header. Navigationspunkte stehen in `app-nav-items.ts`, Header und Drawer rendern sie mit `app-ui-nav-menu`, die Footer-Links zu den Legal Pages dort in `APP_FOOTER_ITEMS`
- Eine Seite, deren Abschnitte über die volle Breite laufen, setzt `shellLayout('full-bleed')` (`@core/layout/shell-layout`) in den `data` ihrer Route, Standard ist `contained` im `page-container`
- `apps/angular-base/src/app/features/<feature>/`: ein Ordner pro Feature, lazy über `<feature>.routes.ts` geladen
  - `domain/`: UseCase des Features und Re-Export der Models aus dem API-Layer. Einziger Ort im Feature, der `@api/*` importiert. Der UseCase reicht aktuell das Repository durch und ist die Stelle, an der ein Feature mehrere API-Layer kombiniert. Kein HTTP
  - `application/`: Store des Features. Nutzt nur `domain`
  - `presentation/`: Pages und Komponenten. Nutzt nur `application` und `domain`
  - `<feature>.routes.ts`: stellt UseCase und Store bereit, beide leben so lange wie das Feature
- `apps/angular-base/src/api/<feature>/`: eigenständiger API-Layer, kennt keine Features. Enthält das DTO (Wire-Format, z. B. `NoteDto`), das Model (z. B. `Note`), den Mapper und das Repository mit den HTTP-Calls. Das Repository gibt nur Models heraus, nie DTOs
- DTOs für Endpunkte der eigenen API-Apps kommen aus `packages/contracts` (`@contracts/*`): Die `*.dto.ts` re-exportiert die Typen (`export type { NoteDto } from '@contracts/notes'`), Limits kommen aus `@contracts/notes-limits`. Nur Typen importieren, damit Zod nicht ins Bundle kommt. `@contracts/*` nur im API-Layer der App und in der Lib `ui` (Rich Text), ESLint erzwingt das
- Mapper sind Klassen, die `DtoMapper` (`apps/angular-base/src/api/dto-mapper.ts`) implementieren, z. B. `NoteDtoMapper`. Pflicht sind beide Richtungen: `toModel` und `toDto`
- `apps/angular-base/src/server/`: Teile des Express-Servers (SEO-Routen, Config, Log), eingehängt in `apps/angular-base/src/server.ts`. Keine Mock-API, die App spricht mit dem echten Backend. Dessen Beschreibung liegt unter `<apiBaseUrl>/docs/openapi.json`
- Features importieren sich nie gegenseitig, einzige Ausnahme ist `@features/auth/public-api`. Innerhalb eines Features relative Imports, sonst die Aliase `@core/*`, `@shared/*`, `@api/*`, `@features/*`
- `notes` ist das Referenz-Feature für CRUD. Ein neues Feature folgt demselben Aufbau
- `legal` enthält Impressum (`/imprint`), Datenschutz (`/privacy`) und Barrierefreiheit (`/accessibility`), alle mit `index: false`. Die Betreiberangaben stehen einmal in `SITE_OWNER` (`apps/angular-base/src/app/site-owner.ts`), Anschrift und Telefon erscheinen erst, wenn sie dort gesetzt sind. Details in `docs/frontend/legal-pages.md`
- `auth` enthält Anmelden (`/sign-in`), Registrieren (`/sign-up`) und den Zustand „wer ist angemeldet“. `AuthStore` und `AuthUseCase` sind app-weit bereitgestellt (`@Service()`), nicht in den Feature-Routen, weil Header und Guards sie auf jeder Seite brauchen. Die App-Shell und andere Features greifen nur über `apps/angular-base/src/app/features/auth/public-api.ts` zu (`AuthStore`, `authGuard`, `guestGuard`, `adminGuard`, `AccountMenu`, Typ `Me`). Details in `docs/frontend/auth.md`
- Eine Route hinter dem Login bekommt `canActivate: [authGuard]`. Der Guard leitet auf `/sign-in?returnUrl=…` um, auf dem Server als Redirect
- Der Router scrollt bei einer neuen Seite nach oben und stellt bei „Zurück“ die Position wieder her (`withInMemoryScrolling` in `app.config.ts`). Kein eigenes `scrollTo` nach einer Navigation

### API und Runtime-Config

- Die Backend-URL steht nicht im Build, sondern in `/config/app-config.json`. Lokal liegt die Datei in `apps/angular-base/config/`, im Container wird sie gemountet
- Zugriff nur über `AppConfigService` (`packages/shared/core/src/config/`), geladen per App-Initializer vor dem ersten Rendern. Neue Config-Werte im Interface `AppConfig`, im Type Guard und in `apps/angular-base/config/app-config.json` ergänzen. Vorhanden: `apiBaseUrl`, `environment`, `logLevel`, `siteUrl`, `allowIndexing`, `allowSignUp`. Später ergänzte Keys sind optional mit Default (`AppConfigFile` → `normalizeAppConfig()`), damit die Config laufender Deployments gültig bleibt
- HTTP-Calls stehen ausschließlich in `apps/angular-base/src/api`
- Die Session ist ein HTTP-only-Cookie des Backends (`sid`), die App speichert kein Token. `credentialsInterceptor` (`packages/shared/core/src/http/`) schickt das Cookie an Requests auf `apiBaseUrl` mit, auf dem Server reicht er das Cookie des eingehenden Requests weiter. `provideAuth()` lädt `/auth/me` per App-Initializer vor dem ersten Rendern
- Das Backend meldet Fehler als `{ "error": { "message": "...", "details": [...] } }`, auf Englisch und ohne Codes. Unterschieden wird nur über den Status, `details` wertet die App nicht aus
- Antworten sind in ein Objekt verpackt (`{ note }`, `{ notes }`, `{ images }`), das Repository packt sie aus
- Dateien gehen als `FormData` ans Backend. Eine Notiz mit Bildern wird in zwei Schritten gespeichert: erst die Notiz als JSON, dann die Dateien an `/notes/{id}/images`. Bilder zeigt ein `<img>` direkt über `NoteImage.url` an, der Browser schickt das Cookie mit
- Es gibt genau einen Fehlertyp: `Failure` (`packages/shared/core/src/failure/`) mit den Kinds `network`, `bad-request`, `unauthorized`, `forbidden`, `not-found`, `conflict` (409), `too-many-requests` (429), `server`, `unknown`. `failureInterceptor` wandelt jeden fehlgeschlagenen Request um, alles andere läuft über `toFailure()`. Stores und Komponenten arbeiten nie mit rohen Fehlern
- Einen `AsyncState` im Template immer über `app-async-content` (`packages/shared/ui/src/async-content/`) rendern, kein eigenes `@switch` über `loadingState`. Die Komponente zeigt den Ladezustand (Spinner als Default, `loadingIndicator="skeleton"` für ein Skeleton) und Fehler, der Inhalt steht in einem `<ng-template>` und wird erst erzeugt, wenn er angezeigt wird
- Fehler außerhalb davon (z. B. fehlgeschlagenes Speichern) über `app-failure-alert` (`packages/shared/ui/src/failure-alert/`) anzeigen. Der Text ist der übersetzte zu `failure.<kind>`. Hat ein Status auf einer Page eine genauere Bedeutung (401 beim Anmelden, 409 beim Registrieren), gibt sie den eigenen Text über `[message]` mit

### Form Controls und UI-Wrapper

- Spartan, `@ng-icons` und Tiptap (`@tiptap/*`) werden nur in der Lib `ui` importiert (`packages/shared/ui/src/ui/` und `packages/shared/ui/src/form-controls/`). Apps und `core` nutzen ausschließlich die Wrapper, so bleibt ein Tausch der UI-Library auf diese Lib begrenzt. Die Nx-Tags erzwingen das (`bannedExternalImports` für `type:app` und `type:core`, `type:helm` nur für `type:ui`)
- Namensschema: Ordner `form-<name>/`, Selector `app-form-<name>`, Klasse `Form<Name>`. Vorhanden: `FormText`, `FormTextarea`, `FormRichText`, `FormFiles`, `FormDate`, `FormSelect`, `FormToggleGroup`, `FormCheckbox`, `FormSwitch`
- Jedes Control ist ein komplettes Feld mit Label, Beschreibung und Fehlermeldungen: `<app-form-text [formField]="_noteForm.title" label="Titel" />`
- Die Controls sind Custom Controls von Signal Forms: `FormValueControl<T>` mit `value = model()` bzw. `FormCheckboxControl` mit `checked = model()`. Zustand (`errors`, `touched`, `disabled`, `required` usw.) kommt nur über die Inputs, die die `FormField`-Direktive bindet. Verlassen des Controls meldet der Output `touch`
- Label, Beschreibung und Fehler rendert ausschließlich `FormControlShell` (`form-control-shell/`), jedes Control setzt sich per Content-Projection hinein. Fehler erscheinen erst, wenn das Feld `touched` ist (`visibleErrorMessages`)
- Die Hülle stellt Spartan `aria-describedby` und den Invalid-Zustand bereit (`BrnFieldA11yService`, eigener `NgControl`-Ersatz). Controls binden deshalb kein `aria-invalid` und kein `forceInvalid` selbst. Ausnahme ist `FormRichText`: sein editierbares `div` ist kein Spartan-Control und bindet die ARIA-Attribute über `shell.labelId()` und `shell.describedBy()`
- `FormFiles` ist eine Drop-Zone und liefert `File[]`. `maxFiles`, `accept` (MIME-Types) und `maxFileSize` begrenzen die Auswahl, abgelehnte Dateien meldet das Control selbst. Das Hochladen übernimmt das Formular
- `FormRichText` liefert einen HTML-String (leer `''`). Die erlaubten Formate stehen einmal in `packages/contracts/src/rich-text.ts`, Tiptap wird nur in `form-rich-text/rich-text-editor.ts` importiert

#### Spartan-Styles

- Der Spartan-Style (`nova`, `vega`, `lyra`, `maia`, `mira`, `luma`) steckt fest im generierten Helm-Code, die CLI ersetzt beim Generieren Platzhalter-Klassen durch die Tailwind-Klassen des Styles. Er ist kein Laufzeit-Theme
- Deshalb eine Helm-Lib pro Style mit derselben API (`helm-vega`, `helm-nova` …). Die Wrapper in `ui` importieren nur `@spartan-ng/helm/*` und kennen den Style nicht
- Default ist `helm-vega` über `tsconfig.base.json`. Eine App mit anderem Style überschreibt in ihrer `tsconfig.json` alle `paths` (TypeScript führt sie nicht zusammen) mit `@spartan-ng/helm/*` auf ihre Lib und trägt die Lib in `implicitDependencies` ihrer `project.json` ein
- Neue Style-Lib: `node tools/scripts/add-helm-style.mjs <style>`. Neue Komponente: `pnpm nx g @spartan-ng/cli:ui <name> --angularCli=true --directory=packages/shared/helm-vega`, den Pfad, den die CLI in `tsconfig.base.json` einträgt, wieder entfernen und die Komponente in jeder Style-Lib erzeugen
- Eigene Klassen in Wrappern und Form-Controls nutzen nur Theme-Tokens, damit sie zu jedem Style passen. Details in `docs/frontend/ui-components.md`

#### UI-Wrapper (`packages/shared/ui/src/ui/`)

- Namensschema: Ordner `<name>/`, Klasse `Ui<Name>`, Selector `app-ui-<name>` (Element) bzw. `appUi<Name>` (Attribut auf einem nativen Element)
- Vorhanden: `UiButton` (`button[appUiButton]`, `a[appUiButton]`, Variante `brand` mit den Tokens `--brand`/`--brand-foreground` der App), `UiText` (`appUiText`), `UiIcon`, `UiSpinner`, `UiSkeleton`, `UiCardImports`, `UiAlert`, `UiEmpty`, `UiAttachmentImports`, `UiRichText`, `UiMenuImports`, `UiNavMenu`, `UiBreadcrumb`, `UiSheet`, `UiDialog` mit `UiDialogService`, `UiConfirmDialogService`, `UiToastService` mit `UiToaster`, `UiToggleGroup` (`app-ui-toggle-group`, Segmented Control außerhalb von Formularen)
- Jeder Wrapper trägt ein englisches JSDoc an der Klasse: ein Satz zum Zweck und ein `@example` mit der Benutzung (Template-Snippet, bei Services TypeScript). Inputs mit nicht offensichtlicher Bedeutung bekommen eine eigene Zeile
- Dünne Wrapper setzen die Helm-Direktive über `hostDirectives` auf und reichen nur die benötigten Inputs durch. Spartan-Typen tauchen in der öffentlichen API nicht auf
- Typografie nur über `appUiText` mit Variante: `<h1 appUiText="h1">`, `<p appUiText="lead">`. Das Element bestimmt die Semantik, die Variante nur die Optik. Große Varianten für Landingpages: `display`, `section`, `title`
- Icons nur über `<app-ui-icon name="plus" />`. Neue Icons in `icon/ui-icons.ts` registrieren, der Schlüssel ist der Name
- Ladezustand eines Buttons über `[loading]`, nicht über einen eigenen Spinner im Inhalt
- Dialoge sind Komponenten, die `UiDialogService.open()` öffnet. Sie bauen ihren Inhalt mit `app-ui-dialog`, lesen Daten mit `injectUiDialogData()` und schließen sich über `injectUiDialogRef()`. Ja/Nein-Fragen laufen über `UiConfirmDialogService.confirm()`
- Eine Navigation aus Einträgen über `<app-ui-nav-menu [items]="_items" [label]="...">`, keine eigene Linkliste. Ein Eintrag mit `children` wird horizontal zum Dropdown, mit `orientation="vertical"` zum aufklappbaren Abschnitt. Nur eine Ebene. `fragment` springt zu einem Abschnitt (`/#projects`), so ein Link gilt nie als aktuell
- Ein Panel vom Bildschirmrand (mobile Navigation, Filter) über `<app-ui-sheet [(open)]="_open" heading="Filter">`, der Inhalt wird hineinprojiziert. `(closed)` meldet, wenn das Panel weg ist und die Seite wieder scrollt
- Gespeicherten Rich Text nur über `<app-ui-rich-text [html]="note.description" />` anzeigen. Das HTML ist nicht vertrauenswürdig, der Wrapper reduziert es auf die erlaubten Formate. Kein eigenes `[innerHTML]` dafür, kein `bypassSecurityTrust*` (per ESLint verboten). Das Backend bereinigt das HTML beim Speichern zusätzlich. Für Seiten der eigenen Site (Rechtsseiten) `profile="page"` an `app-ui-rich-text` und `app-form-rich-text`: erlaubt zusätzlich Pfade der Site und `tel:`, interne Links gehen über den Router
- Dateien und Bilder als Kachel über `<app-ui-attachment>`, mehrere in einer `appUiAttachmentGroup`. Link und Entfernen-Button haben keinen sichtbaren Text und brauchen `linkLabel` bzw. `removeLabel`
- Kurze Rückmeldung nach einer Aktion über `UiToastService`. `app-ui-toaster` steht genau einmal in `app.html`. Fehler, auf die der Nutzer reagieren muss, bleiben bei `app-failure-alert`
- Jeder neue Wrapper bekommt einen Eintrag auf der Showcase-Seite `/showcase/components`

### i18n

- Laufzeit-Übersetzung mit Transloco, Deutsch (Default) und Englisch. `@jsverse/*` wird nur in `packages/shared/core/src/i18n/` importiert, ESLint (`no-restricted-imports` in den Configs von App, `core` und `ui`) erzwingt das. Alle anderen nutzen `I18nService`, die Pipe `t` (`TranslatePipe`) und die Pipe `localDate` (`LocalDatePipe`)
- Kein harter UI-Text in Templates oder TypeScript. Im Template `{{ 'notesList.heading' | t }}` bzw. `| t: { title }`, in TypeScript `i18n.translate('notes.deleted')`
- Ein Scope pro Page, lazy geladen: `i18n/de.json` und `i18n/en.json` im Ordner der Page, daneben `<page>.i18n.ts` mit `defineI18nScope()` und dem `declare module`-Block, der die Keys anmeldet. An der Route `canActivate: [loadI18nScope(<scope>)]`. Keys tragen den Scope-Namen als Präfix (`notesList.heading`). `notes` ist die Referenz
- Übergreifendes steht in den Shared-Texten, die vor dem ersten Rendern laden: die der Lib `ui` in `packages/shared/ui/src/i18n/` (`common`, `failure`, `form`, `language`, `theme`, `uiI18n`) und die der App in `apps/angular-base/src/app/i18n/` (`layout`, `notFound`, `seo`, Feature-Texte, `appI18n`). Beide melden ihre Keys per `declare module` in `I18nSharedTexts` an und gehen an `provideI18n({ shared: [uiI18n, appI18n] })`. Top-Level-Keys dürfen sich nicht überschneiden
- Texte einer Komponente, die mehrere Pages eines Features nutzen, stehen in den Shared-Texten der App unter dem Feature-Namen (`notes.delete.heading`). Jede App liefert `seo.defaultDescription` und `seo.imageAlt`, die `SeoService` erwartet
- Keys sind typisiert (`TranslationKey`), ein Tippfehler ist ein Compile-Fehler. Jeder Key steht in jeder Sprachdatei
- Routen-`title` ist ein Translation-Key, `SeoService` übersetzt ihn
- Texte, die stehen bleiben (Navigation, Optionen, Statuszeilen), als Key halten und im Template übersetzen, nicht als fertigen String speichern. Validierungsmeldungen als Funktion: `message: () => this._i18n.translate(...)`
- Datum über `localDate` (`'date'`, `'dateTime'`, `'weekdayDate'`, `'time'`), nicht über `DatePipe`. Die Locale kommt aus `I18nService.locale()`. Gehört ein Zeitpunkt zu etwas mit eigener Zeitzone (ein Event), die Zone als zweites Argument übergeben (`| localDate: 'time' : event.timeZone`), sonst rendert der Server in UTC eine andere Uhrzeit als der Browser
- Texte aus dem Backend in beiden Sprachen sind `Localized<T>` (`{ de, en }`, `@core/i18n/localized`) und werden über die Pipe `localized` bzw. `I18nService.localize()` angezeigt, nicht über Keys
- Die Sprache steht im Cookie `lang`. Der Server liest Cookie und `Accept-Language` und rendert `<html lang>`, der Browser übernimmt das. Umschalten über `I18nService.setLanguage()` bzw. `app-language-toggle`
- `Failure.message` ist englisch und fürs Log, auch wenn sie vom Backend kommt. Dem Nutzer zeigt `app-failure-alert` den übersetzten Text zu `failure.<kind>` oder den eigenen Text der Page
- In Specs sind die deutschen Shared-Texte des Projekts immer da: `src/test-setup.ts` jedes Projekts ruft `setupTestEnvironment()` (`@core/testing/setup-test-environment`) mit `provideI18nTesting({ shared, sharedDe })` auf. `core` nutzt eigene Testtexte, ein Lib-Spec, der App-Texte bräuchte, bringt einen eigenen Scope mit. Der Spec einer Page lädt ihren Scope mit `await loadI18nScopes(<scope>)` vor `createComponent`

### SEO

- Titel und Meta-Tags schreibt ausschließlich `SeoService` (`packages/shared/core/src/seo/`): `<title>` mit Suffix `| APP_NAME`, Description, Robots, Canonical, `og:*`, `twitter:card`. Kein `Title` oder `Meta` in Features, `shared` oder im Layout
- Jede Route trägt ihre Angaben über `data: routeSeo({ ... })`: öffentliche Seiten eine `description` (Translation-Key im Scope der Page), Formulare und interne Seiten `index: false`. Kind-Routen übernehmen die Angaben der Eltern
- Meta-Daten aus geladenen Daten über `injectPageSeo(() => ...)` im Konstruktor der Page, Rich Text dafür mit `toMetaDescription()` kürzen. `NoteDetail` ist die Referenz. Ein Vorschaubild aus geladenen Daten ist ein `PageSeoImage` mit `url`, `width`, `height` und `alt`
- `siteUrl` und `allowIndexing` stehen in `apps/angular-base/config/app-config.json`. `allowIndexing` ist nur in Produktion `true`, sonst bekommt jede Seite `noindex` und `robots.txt` sperrt alles
- Eine Seite, die „nicht gefunden“ zeigt, antwortet mit 404. `app-async-content` übernimmt den Status eines `Failure` automatisch, alles andere setzt ihn über `injectResponseStatus()` (`packages/shared/core/src/http/response-status.ts`). Unbekannte Pfade landen auf der `**`-Route mit `NotFound` (`apps/angular-base/src/app/layout/not-found/`)
- `robots.txt` und `sitemap.xml` erzeugt der Express-Server (`apps/angular-base/src/server/seo-routes.ts`). Ein Feature mit öffentlichen Seiten ergänzt seine Sitemap-Einträge in `apps/angular-base/src/server.ts`. Notizen sind privat, ihre Routen tragen `index: false` und stehen nicht in der Sitemap
- Das Vorschaubild für geteilte Links ist `apps/angular-base/public/og-image.png` (1200×630), Icons und `manifest.webmanifest` liegen ebenfalls in `apps/angular-base/public/`

### CI und Deployment

- Pipeline in `.github/workflows/ci.yml`: Format-Check und `nx affected -t lint typecheck test build` bei Push auf `main` und bei Pull Requests, `nx run-many -p <app>` nur für die App eines Release-Tags, jeweils mit `--parallel=4`. Dieselben Befehle vor dem Push lokal ausführen (`pnpm format:check`, `pnpm nx affected -t lint typecheck test build`)
- Actions in `.github/workflows/` immer auf den Commit-SHA mit Versionskommentar pinnen (`uses: owner/action@<sha> # vX.Y.Z`), nie auf einen Tag. Dependabot hält Actions und npm-Abhängigkeiten aktuell (`.github/dependabot.yml`, siehe `docs/deployment.md`)
- Vitest mit Analog prüft keine Typen, deshalb gibt es pro Projekt das Target `typecheck`, das auch die Specs mit `tsc` prüft
- Der Job `checks` startet einen Postgres-Service für die Tests der API-Projekte
- Jede App hat ihr eigenes Release-Tag `nx1-<app>-v*` (z. B. `nx1-portfolio-web-v1.2.0`). Es baut `apps/<app>/Dockerfile` aus dem Workspace-Root und schiebt das Image als `ghcr.io/<owner>/nx1-<app>` nach GHCR, getaggt mit der Version ohne Präfix, `latest` und `sha-<kurz>`. Node-Version steht in `.nvmrc`, pnpm-Version in `packageManager`
- Nichts Umgebungsspezifisches im Image. Das Deployment mountet seine Config über `/app/dist/angular-base/browser/config/app-config.json` (das Image kopiert die Ausgabe aus `dist/apps/angular-base` dorthin) und setzt `NG_ALLOWED_HOSTS` auf die öffentlichen Hostnamen, sonst lehnt Angular SSR die Requests mit 400 ab
- Commits folgen Conventional Commits (`<type>(<scope>): <beschreibung>`, Scopes in `commitlint.config.mjs`), ein commit-msg-Hook und die CI prüfen das. `fix` → Patch, `feat` → Minor, `!`/`BREAKING CHANGE` → Major, alle anderen Typen ändern keine Version. Welche Apps ein Commit betrifft, entscheiden die geänderten Dateien (auch über Libs), nicht der Scope
- Releases nur über `pnpm nx release` (Version in der `package.json` der App, `CHANGELOG.md`, Commit, Tag `nx1-<app>-v*`), danach `pnpm release:push` (pusht `main` und jeden Tag einzeln, bei mehr als drei Tags in einem Push startet GitHub keinen Workflow). Keine Tags von Hand setzen, kein `git push --follow-tags`
- Die laufende Version: Frontends über den Token `APP_VERSION` (`@core/app-version`, in `app.config.ts` aus der `package.json`), APIs über `createServer({ version })` in `/health`
- Details in `docs/deployment.md` und `docs/releasing.md`

### Logging

- Kein `console.*` im Code, das verbietet `no-console`. In der App über `AppLog` (`packages/shared/core/src/log/`) loggen, im Express-Server über `ServerLog` (`apps/angular-base/src/server/server-log.ts`)
- Beide erben von `Log` und schreiben dasselbe Format. Das Level (`debug | info | warn | error | off`) kommt aus `logLevel` in `apps/angular-base/config/app-config.json`
- Unbehandelte Fehler der App landen über `AppErrorHandler` in `AppLog`
- `notice()` nur für Zeilen, die sagen, was läuft (Port, Environment beim Serverstart). Sie erscheinen bei jedem Level außer `off`
- Log-Meldungen immer auf Englisch, auch wenn die UI-Texte deutsch sind

### Store-Muster

- Reine Signals, keine State-Library. Ein Store pro Feature mit `@Service({ autoProvided: false })`, bereitgestellt in den Feature-Routen. Ausnahme ist `AuthStore`, der app-weit lebt
- Jeder asynchrone Vorgang wird als `AsyncState` (`{ loadingState, failure }`, `packages/shared/core/src/state/async-state.ts`) nach außen gegeben, `loadingState` ist `'idle' | 'loading' | 'success' | 'failure'`. Zustände nur über `idle()`, `loading()`, `success()`, `failed()` erzeugen
- Muss eine Seite ihre Daten beim Öffnen schon haben (z. B. für `#fragment`-Links), wartet ein Route-Guard mit `settled(resource, injector)` (`@core/state/settled`)
- Lesen über `rxResource`, der Zustand dazu über `asyncState(resource)`. Daten als readonly Signals und `computed`. `value()` einer fehlgeschlagenen Resource wirft, daher mit `hasValue()` absichern
- Schreiben über `async`-Methoden, die den Vorgang durch `mutation().run()` (`packages/shared/core/src/state/mutation.ts`) schicken. `run()` setzt den `AsyncState` der Mutation und liefert bei einem Fehler `undefined`, statt zu werfen. Kein eigenes `try/catch` im Store
- Ein Store hat im Normalfall eine `mutation()` und gibt deren `state` als `mutationState` heraus. Schreibvorgänge, die parallel laufen können, bekommen je eine eigene
- Nach einem erfolgreichen Schreiben die geladene Liste über `patchResource()` (`packages/shared/core/src/state/patch-resource.ts`) lokal aktualisieren statt neu zu laden
- Keine Store-Basisklasse. Gemeinsames Verhalten kommt als Funktion nach `packages/shared/core/src/state/`

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## API-Apps (Express)

Express 5, Drizzle ORM auf Postgres, Zod 4. Ausführlich in `docs/backend/` (Einstieg in `docs/README.md`).

### Befehle

Postgres muss laufen: `docker compose up -d` im Workspace-Root (ein Server für alle API-Apps, eine Datenbank pro App, z. B. `express_api_base`). Die Datenbanken legt `tools/postgres/init-databases.sql` beim ersten Start an, nur bei leerem Volume. Bei bestehendem Volume eine neue einmal mit `docker compose exec postgres createdb -U app <name>` anlegen.

```sh
pnpm nx serve express-api-base                 # tsx watch, lädt apps/express-api-base/.env
pnpm nx build express-api-base                 # rolldown: App + Libs -> dist/apps/express-api-base
pnpm nx run-many -t lint typecheck test -p express-api-base server-core server-auth contracts
pnpm nx run express-api-base:db:generate       # drizzle-kit: *.table.ts -> neue SQL-Migration in drizzle/
pnpm nx run express-api-base:db:migrate        # Migrationen auf DATABASE_URL aus .env anwenden
pnpm nx run express-api-base:db:studio
```

Ersteinrichtung: `apps/express-api-base/.env.example` nach `.env` kopieren, `SESSION_SECRET` (min. 32 Zeichen) setzen, dann `db:migrate`.

### Aufbau

- `packages/contracts/src/` (Lib `contracts`, Alias `@contracts/*`): Zod-Schemas des Wire-Formats für Requests und Responses (`notes`, `auth`, `errors`), daraus abgeleitete Typen (`*Dto`, `*Input`), Limits als Konstanten ohne Zod (`notes-limits`) und die Rich-Text-Regeln (`rich-text`). Läuft in Node und im Browser, importiert nur `zod`
- `packages/server/core/src/` (Lib `server-core`, Alias `@server/core/*`): `config` und `extendConfig(fileShape, envShape?)`, `logger` (redacted Cookie und Set-Cookie), `errors`, `validate`, Middleware (Error-Handler, Origin-Check), `db/db` und `db/migrate`, OpenAPI-Helfer mit `buildOpenApiDocument()`, `createServer({ prefix })` und `startServer()`, `images` (Bildverarbeitung mit Pixel-Limit), `createRateLimit()`, `testing/global-setup`. Kennt keine Features
- `packages/server/auth/src/` (Lib `server-auth`, Alias `@server/auth/*`): Tabellen `users` und `session`, Registrieren, Anmelden, Abmelden, `/auth/me`, Session-Middleware, Guards `requireAuth`/`requireAdmin`, `currentUserId(req)`, Rate-Limit, Admin-Endpunkte, `seedAdmin()`, `onUserDeleted()`, Test-Helfer. Kennt keine Features
- `apps/express-api-base/`: die Features (`notes`, `docs`), die App-Config-Erweiterung (`uploads`), `config/`, `drizzle/`, `Dockerfile`, `docker-compose.prod.example.yml`
- Der Workspace ist ESM (`"type": "module"` in der Root-`package.json`). Sonst lädt `tsx` im Dev-Modus die Server-Libs als CommonJS, und Top-Level-Await bricht
- Die App wird gebündelt, Imports brauchen keine `.js`-Endung (ältere Dateien haben sie noch, beides geht). Die npm-Pakete bleiben extern und stehen in `apps/express-api-base/package.json`, die das Image installiert. Ein neues Runtime-Paket dort und in der Root-`package.json` eintragen

### Konfiguration

- Env-Variablen für Secrets und Zeiger: `CONFIG_PATH`, `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`. Eine JSON-Datei unter `CONFIG_PATH` (`config/*.json`) für alles andere, Ausnahme `admin.email`/`admin.password` für den ersten Admin
- Was jede API-App hat, steht im Basis-Schema in `packages/server/core/src/config.ts`, die Libs lesen `@server/core/config`. Eigene Keys einer App kommen über `extendConfig({...})` in `src/config/index.ts` der App, ihre Features importieren diesen `config`. Ein neuer Key gehört in jede Datei in `config/` der App (und bei Basis-Keys in `packages/server/auth/src/testing/test-config.json`). Ein Key, den die Basis auch hat (`uploads`, `rateLimit`), wird eine Ebene tief zusammengeführt. Env-Variablen einer App kommen als zweites Argument und landen unter `config.env`. Später ergänzte Basis-Keys haben Defaults (`auth.signUpEnabled: true`, `uploads`), damit laufende Deployments gültig bleiben
- Code liest das eingefrorene `config`, nie `process.env`. Ausnahme ist `src/scripts/migrate.ts`, das nur `DATABASE_URL` liest

### Features

- Ein Ordner pro Feature in `src/features/<name>/` der App, eine Datei pro Rolle `<name>.<rolle>.ts`: `*.table.ts` (Drizzle, über den Glob in `drizzle.config.ts` gefunden), `*.routes.ts` (dünner Router: `parse()`, Service aufrufen, antworten), `*.service.ts` (Logik und alle DB-Zugriffe, wirft `HttpError`), `*.openapi.ts` (`register<Name>Docs(registry)`), `*.test.ts` (supertest gegen die ganze App)
- Schemas für Request und Response in `packages/contracts`, wenn ein Frontend die Endpunkte nutzt, sonst neben dem Feature
- Ein Feature registrieren: Router in `routes` von `createServer()` in `src/app.ts`, Register-Funktion in `register` von `src/features/docs/docs.document.ts`, Router in die Liste in `docs.test.ts`
- Räumt ein Feature beim Löschen eines Users mehr auf als die DB-Kaskade (z. B. Dateien), registriert es in `src/app.ts` einen Hook mit `onUserDeleted()`. Admin kennt keine Features

### Konventionen über Dateien hinweg

- **Fehler**: Helfer aus `@server/core/errors` (`badRequest`, `notFound`, …) werfen, auch in async Handlern (Express 5 reicht Rejections weiter). Der Error-Handler macht daraus `{ error: { message, details? } }`, Unbekanntes wird ein geloggter 500er
- **Validierung**: `parse()` aus `@server/core/validate` liefert die typisierte Ausgabe oder wirft einen 400er mit `details` pro Feld
- **Auth**: Cookie-Sessions (`express-session` in Postgres über `connect-pg-simple`). Routen mit `requireAuth` schützen, den User mit `currentUserId(req)` lesen. Die Tabelle `session` steht in `sessions.table.ts` nur, damit sie Teil der Migrationen ist, und muss das Layout von connect-pg-simple behalten
- **Rollen**: `users.role` ist `user` oder `admin`. `requireAdmin` liest sie bei jedem Request aus der DB (401 ohne Session, sonst 403). `seedAdmin()` läuft in `src/index.ts` vor dem Start und legt den Admin aus `config.admin` nur an, solange keiner existiert. `/admin` verweigert Änderungen am eigenen Account mit 409
- **CSRF**: keine Tokens. Der Origin-Check lehnt zustandsändernde Requests ab, deren `Origin` nicht in `config.cors.origins` (oder der eigene) ist
- **Besitz**: Services filtern jede Query nach `userId`, eine fremde Ressource ist ein 404, kein 403
- **Docs per Test synchron**: `docs.test.ts` schlägt fehl, wenn eine Route ohne OpenAPI-Eintrag existiert oder umgekehrt, und prüft echte Antworten gegen die Schemas mit `.strict()`
- **Rich Text**: `notes.sanitize.ts` erlaubt genau `RICH_TEXT_TAGS` aus `@contracts/rich-text`, dieselbe Liste wie der Editor im Frontend

### Tests

- Brauchen Postgres, aber keine `.env`: `vitest.config.ts` jedes Projekts setzt die Umgebung selbst. Jedes Projekt hat eine eigene Test-Datenbank (`express_api_base_test` für die App, `server_auth_test` für die Lib), weil Nx die Tests mehrerer Projekte gleichzeitig ausführt
- `packages/server/core/src/testing/global-setup.ts` legt die Datenbank an und migriert. `server-auth` migriert mit eigenen Migrationen in `packages/server/auth/drizzle/`, die nur die Auth-Tabellen enthalten
- `src/test/setup.ts` der App leert vor jedem Test `users` und `session` (`resetAuthTables()`, kaskadiert auf alles andere) und das Upload-Verzeichnis. Dateien laufen nacheinander
- `signedUpAgent(email)` und `adminAgent()` aus `src/test/helpers.ts` der App, sie umhüllen `@server/auth/testing/helpers`. Auth und Admin testet die Lib gegen eine Minimal-App

### Migrationen

- Eine `*.table.ts` ändern, `db:generate` der App ausführen, die erzeugten Dateien in `drizzle/` committen. Angewendete Migrationen nicht ändern
- Ändern sich die Auth-Tabellen, `db:generate` jeder API-App und `pnpm nx run server-auth:db:generate` ausführen
- In Produktion führt das Image `node dist/scripts/migrate.js` aus (das Dockerfile kopiert `drizzle/` dafür)

### Neue API-App

`apps/express-api-base` ist die Referenz für `project.json` (Tag `type:api-app`), `package.json`, `tsconfig.json`, `rolldown.config.ts`, `vitest.config.ts`, `drizzle.config.ts` (mit `../../packages/server/auth/src/*.table.ts`), `eslint.config.mjs` und `Dockerfile`. Eigene Datenbank (Eintrag in `tools/postgres/init-databases.sql`) und Test-Datenbank, eigenes Release-Tag und Publish-Job in der CI. Details in `docs/workspace.md`
