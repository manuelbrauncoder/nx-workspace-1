# dartomat-web

Dartomat, a scoreboard for 301 on the phone: choose the players, tap the darts, see the checkout. Every game lives in `dartomat-api` and can be shared by its link. Built like `angular-base` on the same libs, so this page only covers what differs.

| Item    | Value                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------- |
| Folder  | [apps/dartomat-web](../../apps/dartomat-web)                                                      |
| Tags    | `type:app`, `scope:dartomat`                                                                      |
| Locally | <http://localhost:4200>, talks to `dartomat-api` on <http://localhost:3200/api/v1>                |
| Libs    | `core`, `ui`, `styles`, `dartomat-contracts`                                                      |
| Image   | `ghcr.io/<owner>/nx1-dartomat-web`, tag `nx1-dartomat-web-v*`, see [Deployment](../deployment.md) |

## Running it

The app needs the API, see [dartomat-api](dartomat-api.md#running-it). Both together:

```bash
pnpm nx run-many -t serve -p dartomat-api dartomat-web
```

The ports differ from the other products, so all of them run side by side.

## Pages

| Route       | Feature | Content                                                                        |
| ----------- | ------- | ------------------------------------------------------------------------------ |
| `/`         | –       | Redirects to `/setup`                                                          |
| `/setup`    | `setup` | Players (order with arrow buttons), finish, recent names of this device, start |
| `/game/:id` | `game`  | Scores, current player, checkout, keypad, options sheet, result once it is won |

A game the API does not know shows "Spiel nicht gefunden" and answers with 404.

## Differences to angular-base

- **Look**: the design "Fokus" with the Trail theme in dark only, font Overpass. `FORCED_THEME_MODE` is `'dark'`, `index.html` sets `class="dark"`, there is no theme toggle. `--brand` is the trail-marker yellow
- **Mobile first**: no app shell, no header or footer. Each page fills the screen (`100dvh`) in a `.page-container` of at most 30rem, safe areas at the bottom are respected
- **UI**: the options are an `app-ui-sheet` from the bottom, quitting and restarting ask through `UiConfirmDialogService`, the multiplier is an `app-ui-toggle-group`, the finish an `app-form-toggle-group`
- **No auth**: no credentials interceptor, no `provideAuth()`, no `allowSignUp`
- **Recent players**: the last names are kept in `localStorage` (`dartomat.players.v1`), read after the first render so the server render stays the same
- **SEO**: `/setup` is the only public page and the only one in the sitemap, games are `noindex`
