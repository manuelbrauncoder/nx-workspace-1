# Authentication

Users sign up and sign in with email and password. The backend keeps the session, the app only knows who is signed in. This doc covers the session cookie, the `auth` feature, how other parts of the app use it and what server rendering needs.

## The session

- The backend sets an HTTP-only cookie named `sid` on sign-up and sign-in and clears it on sign-out. The app never sees the value and stores no token
- `GET /auth/me` answers with the signed-in user, or with 401
- The cookie is `SameSite=Lax` without a `Domain`, and it lasts seven days

### Sending the cookie

[packages/shared/core/src/http/credentials.interceptor.ts](../packages/shared/core/src/http/credentials.interceptor.ts)

```ts
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (!inject(AppConfigService).isApiUrl(req.url)) {
    return next(req);
  }
  const cookie = inject(REQUEST, { optional: true })?.headers.get('cookie');
  return next(
    req.clone({ withCredentials: true, ...(cookie ? { setHeaders: { Cookie: cookie } } : {}) }),
  );
};
```

- In the browser `withCredentials` makes the browser attach the cookie, although the backend is another origin
- The server has no cookie store. It passes on the cookies of the request it is rendering, so a server-rendered page knows who is signed in
- Both apply to requests to `apiBaseUrl` only. Nothing else ever gets the cookie

### What a deployment needs

- The backend must allow the origin of the app for CORS with credentials. Locally that is `http://localhost:4000`
- The browser must send the cookie to the app as well, otherwise the server renders every page signed out. A cookie without `Domain` belongs to the host of the backend, so app and backend need the same host name (e.g. the backend behind `/api` of the app), or the backend sets `Domain` to their common parent. Locally it works because cookies ignore the port
- The server must reach `apiBaseUrl` itself, not only the browser

## The `auth` feature

```text
apps/angular-base/src/api/auth/
├── me.dto.ts            MeDto, MeResponseDto, SignInDto, SignUpDto
├── me.ts                Me, Credentials, Registration, the length limits
├── me-dto.mapper.ts     MeDtoMapper
└── auth.repository.ts   getMe(), signIn(), signUp(), signOut()

apps/angular-base/src/app/features/auth/
├── domain/              AuthUseCase, re-export of the models
├── application/         AuthStore, the guards, sessionExpiredInterceptor
├── presentation/        SignIn, SignUp, AccountMenu
├── auth.routes.ts       /sign-in and /sign-up
├── provide-auth.ts      loads the session before the app starts
└── public-api.ts        what the rest of the app may import
```

The signed-in user is called `Me`, not `User`. `User` stays free for the list of all users in an admin feature.

### `AuthStore`

[apps/angular-base/src/app/features/auth/application/auth.store.ts](../apps/angular-base/src/app/features/auth/application/auth.store.ts)

| Member                              | Meaning                                                           |
| ----------------------------------- | ----------------------------------------------------------------- |
| `me`                                | The signed-in user, `undefined` when signed out                   |
| `isSignedIn`, `isAdmin`             | Derived from `me`                                                 |
| `mutationState`                     | State of the most recent sign-in or sign-up                       |
| `signOutState`                      | State of signing out, separate because it runs from the header    |
| `signIn()`, `signUp()`, `signOut()` | Run the request and update `me`                                   |
| `getMe()`                           | Asks the backend who is signed in, called once by `provideAuth()` |
| `clearMe()`                         | Forgets the user without a request, after the backend ended it    |

It differs from the store of other features in one point: `AuthStore` and `AuthUseCase` are provided app-wide with `@Service()` and not in the feature routes. The header and the guards of other features need them on every page, long before the lazy routes of the feature are loaded.

### Before the first render

`provideAuth()` registers an app initializer that waits for the runtime config and then calls `AuthStore.getMe()`. Guards and the header therefore read `isSignedIn()` synchronously, on the server and in the browser.

A backend that cannot be reached must not keep the app from starting. `getMe()` then logs a warning and leaves the user signed out.

### Public API

Features never import each other and the app shell knows no features. The auth feature is the one exception, limited to a single file:

[apps/angular-base/src/app/features/auth/public-api.ts](../apps/angular-base/src/app/features/auth/public-api.ts)

```ts
export { adminGuard, authGuard, guestGuard } from './application/auth.guards';
export { AuthStore } from './application/auth.store';
export { sessionExpiredInterceptor } from './application/session-expired.interceptor';
export type { Me, MeRole } from './domain/me';
export { AccountMenu } from './presentation/account-menu/account-menu';
export { provideAuth } from './provide-auth';
```

ESLint lets `@features/auth/public-api` through in features and in `layout`, every other path into the feature stays a lint error. `core` and `shared` have no exception.

## Protecting a route

```ts
import { authGuard } from '@features/auth/public-api';

{
  path: 'notes',
  canActivate: [authGuard],
  loadChildren: () => import('./features/notes/notes.routes').then((m) => m.notesRoutes),
}
```

| Guard        | Lets through     | Everyone else                                               |
| ------------ | ---------------- | ----------------------------------------------------------- |
| `authGuard`  | signed-in users  | to `/sign-in?returnUrl=<requested page>`                    |
| `guestGuard` | signed-out users | to `returnUrl`, otherwise to the start page                 |
| `adminGuard` | admins           | signed out: to `/sign-in`, without admin rights: start page |

During server rendering the redirect of a guard is a real HTTP redirect.

`returnUrl` comes from the URL and is not trustworthy. `safeReturnUrl()` only accepts a path inside the app, so `/sign-in?returnUrl=https://evil.example` ends on the start page.

A guard only hides a page. What a user may read or change is decided by the backend.

## Reading the user

```ts
import { AuthStore } from '@features/auth/public-api';

private readonly _auth = inject(AuthStore);

private readonly _canDelete = computed(() => this._auth.isAdmin());
```

## When the session ends

The backend can end a session at any time: it expires, or an admin revokes it. The app notices on the next request, which comes back with 401. `sessionExpiredInterceptor` then clears the store and opens the sign-in page with the current page as `returnUrl`.

It leaves the auth endpoints alone. There a 401 means wrong credentials (`/auth/sign-in`) or nobody signed in (`/auth/me`).

## Sign-in and sign-up

Both pages are Signal Forms with `app-form-text`, see [Forms](forms.md). The rules mirror the backend: an email address, a password of 8 to 128 characters, an optional name of at most 100.

The backend tells failures apart by status only, so the pages give two of them their own text and leave the rest to the generic one, see [Error handling](error-handling.md#app-failure-alert):

| Page    | Status | Text                                              |
| ------- | ------ | ------------------------------------------------- |
| Sign-in | 401    | E-Mail-Adresse oder Passwort ist falsch.          |
| Sign-up | 409    | Zu dieser E-Mail-Adresse gibt es schon ein Konto. |
| both    | 429    | Zu viele Versuche. (generic)                      |

The backend limits the auth endpoints to 20 requests in 15 minutes.

## What the backend does not offer

There are no endpoints for a forgotten password, changing the password, confirming the email address, editing the profile or deleting the own account. The feature has no pages for them.
