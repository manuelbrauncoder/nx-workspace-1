# vyte-web

The web app of vyte: a host plans an event, keeps its guest list and shares a personal link with every guest. So far it is the frame: app shell, sign-in, legal pages, a placeholder start page and the complete API layer for `vyte-api`. The pages of the [specification](../vyte/spec.md#7-web-draft) follow. Built like `angular-base` on the same libs, so this page only covers what differs.

| Item    | Value                                                                                     |
| ------- | ----------------------------------------------------------------------------------------- |
| Folder  | [apps/vyte-web](../../apps/vyte-web)                                                      |
| Tags    | `type:app`, `scope:vyte`                                                                  |
| Locally | <http://localhost:4300>, talks to `vyte-api` on <http://localhost:3300/api/v1>            |
| Libs    | `core`, `ui`, `styles`, `contracts`, `vyte-contracts`                                     |
| Image   | `ghcr.io/<owner>/nx1-vyte-web`, tag `nx1-vyte-web-v*`, see [Deployment](../deployment.md) |

## Running it

The sign-in needs the API, see [vyte-api](vyte-api.md). Both together:

```bash
pnpm nx run-many -t serve -p vyte-api vyte-web
```

The ports differ from the other products, so all of them run side by side. `build -c watch` and `server` work as for [angular-base](angular-base.md#running-it).

## Pages

| Route                                    | Feature | Content                                                      |
| ---------------------------------------- | ------- | ------------------------------------------------------------ |
| `/`                                      | `home`  | Placeholder: what vyte is and the way to the sign-in         |
| `/sign-in`                               | `auth`  | Sign-in. There is no sign-up page, accounts come from a link |
| `/imprint`, `/privacy`, `/accessibility` | `legal` | From `angular-base`, with `SITE_OWNER`                       |

Every other route of the [web draft](../vyte/spec.md#7-web-draft) is still missing and answers with the 404 page.

## API layer

`src/api` covers every endpoint of `vyte-api`, each folder with DTO re-export, model, mapper, repository and specs as described in [API and config](../frontend/api-and-config.md). No feature uses it yet except `auth`.

| Folder             | Contract                     | What it talks to                                                                   |
| ------------------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| `auth/`            | `@contracts/auth`            | Sign-in, sign-out, `/auth/me`                                                      |
| `account-invites/` | `@contracts/account-invites` | Account links: the admin's list, and creating the account behind `/welcome/:token` |
| `users/`           | `@contracts/auth`            | Accounts of the admin area                                                         |
| `events/`          | `@vyte/contracts/events`     | Events, their images, the save-the-date and photo-stand settings                   |
| `guests/`          | `@vyte/contracts/guests`     | Guest list, answers a host records, renewing links, address of the CSV export      |
| `team/`            | `@vyte/contracts/team`       | Members, handover, editor invites of the owner                                     |
| `invites/`         | `@vyte/contracts/team`       | An editor invite as the invited person sees it: preview, accept, sign up           |
| `rsvp/`            | `@vyte/contracts/guests`     | The personal page of a guest: invitation, answer                                   |
| `save-the-date/`   | `@vyte/contracts/events`     | The public save-the-date page                                                      |
| `photos/`          | `@vyte/contracts/photos`     | The gallery of the hosts: hide, delete, address of the ZIP download                |
| `upload/`          | `@vyte/contracts/photos`     | The upload page of a guest and of the photo stand (`UploadLink`)                   |

- **`VyteEvent`**: the model of an event is not called `Event`, that name is the DOM event in every file that does not import it
- **Dates** are `Date` in the models. What an event or a guest does not have stays `null`, as on the wire
- **Addresses of files**: `EventImage.url` is part of the model, as with the notes of the base. Where a DTO does not say whose file it is (photos, images behind a token), the repository builds the address: `imageUrl()`, `photoUrl()`, `coverUrl()`. The same goes for downloads the browser fetches itself: `exportUrl()` (CSV), `archiveUrl()` (ZIP), `calendarUrl()` (ICS)
- **Results with two shapes**: `Invitation` and `SaveTheDate` are unions on `past`. After the event they hold the title only
- **Uploads of guests** go one file per request (`UploadsRepository.upload()`). The limit and what is left come with every answer (`Upload.limit`, `Upload.left`), nothing is counted in the app

## Differences to angular-base

- **Look**: the design "Konfetti" in light only, fonts Unbounded (headings) and DM Sans. `FORCED_THEME_MODE` is `'light'`, there is no theme toggle and no `_dark.scss`. `--brand` is the yellow with ink on it, `--primary` the blue; `--decor` and `--soft` are extra tokens. The values come from the [design](../vyte/design/README.md)
- **No sign-up**: no page, no route, no `signUp` in `AuthStore`, `allowSignUp` is `false`. An account comes from an account link of the admin or from an editor invite, both are in the API layer already
- **Navigation**: `APP_NAV_ITEMS` is empty until the first feature has a page. Header and drawer then show no navigation and no menu button
- **App shell**: reads `shellLayout()`, so a page can ask for the full width, as in `portfolio-web`. The logo is the wordmark `vyte` as text
- **No notes, no showcase**: the reference features of the base are left out
- **SEO**: `/` is the only page in the sitemap, everything else is behind the sign-in or behind a personal link
- **Config**: [config/app-config.json](../../apps/vyte-web/config/app-config.json) with `apiBaseUrl` ending in `/api/v1`
