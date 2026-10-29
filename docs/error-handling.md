# Error handling

The app has exactly one error type, `Failure`. Everything that can go wrong is converted into it at the edge, so stores and components never deal with an `HttpErrorResponse` or an unknown thrown value. This doc follows an error from the failed request to the message on screen.

## `Failure`

[src/app/core/failure/failure.ts](../src/app/core/failure/failure.ts)

```ts
export type FailureKind =
  | 'network'
  | 'bad-request'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'too-many-requests'
  | 'server'
  | 'unknown';

export class Failure extends Error {
  override readonly name = 'Failure';
  readonly status: number | undefined;

  constructor(
    readonly kind: FailureKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.status = options?.status;
  }
}
```

| Field     | Use                                                                     |
| --------- | ----------------------------------------------------------------------- |
| `kind`    | What went wrong, for decisions in code (`failure.kind === 'not-found'`) |
| `message` | English text for the log, never shown to the user                       |
| `status`  | HTTP status, when the failure came from a request                       |
| `cause`   | The original error, for logging                                         |

`Failure` extends `Error` because a resource only passes `Error` instances through unchanged.

## From a response to a `Failure`

`toFailure()` in [src/app/core/failure/to-failure.ts](../src/app/core/failure/to-failure.ts) is the single place where a thrown value becomes a `Failure`:

| Input                                   | Result                                            |
| --------------------------------------- | ------------------------------------------------- |
| a `Failure`                             | returned unchanged                                |
| an `HttpErrorResponse`                  | kind derived from the status, see below           |
| an `Error` whose `cause` is a `Failure` | that `Failure`, e.g. after a resource wrapped it  |
| anything else                           | kind `unknown` with the original value as `cause` |

| HTTP status | Kind                |
| ----------- | ------------------- |
| 0           | `network`           |
| 401         | `unauthorized`      |
| 403         | `forbidden`         |
| 404         | `not-found`         |
| 409         | `conflict`          |
| 429         | `too-many-requests` |
| other 4xx   | `bad-request`       |
| 5xx         | `server`            |

The backend reports errors as `{ "error": { "message": "...", "details": [...] } }`. Its messages are English and carry no error code, so the status is all the app can tell failures apart by. A backend that reports errors differently is adapted in `serverMessage()`, nowhere else. `details` lists the fields that failed validation. The app does not read them, the forms check the same rules before they send anything.

`message` is for the log and always English: the message of the backend if there is one, otherwise a default for the kind. The user never reads it. `app-failure-alert` shows the translated text for the kind (`failure.<kind>` in the shared scope, see [Internationalization](i18n.md)), or a text the page passes in.

### The interceptor

`failureInterceptor` runs `toFailure()` on every failed request:

[src/app/core/http/failure.interceptor.ts](../src/app/core/http/failure.interceptor.ts)

```ts
export const failureInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toFailure(error))));
```

It is registered in [app.config.ts](../src/app/app.config.ts). Repositories therefore need no error handling of their own.

### Into the state

The two helpers a store uses convert on their own:

- `asyncState(resource)` calls `toFailure(resource.error())` for a failed read
- `mutation().run()` catches a failed write and stores `failed(toFailure(error))`

In both cases the store exposes an `AsyncState` whose `failure` is set exactly when `loadingState` is `'failure'`. See [State management](state-management.md).

Code outside these two paths that catches something calls `toFailure()` itself. Never pass a raw error on.

## Showing failures

Three places, each for a different situation:

| Situation                                  | Use                 |
| ------------------------------------------ | ------------------- |
| Content could not be loaded                | `app-async-content` |
| An action failed and the user has to react | `app-failure-alert` |
| Short confirmation that something worked   | `UiToastService`    |

### `app-async-content`

Renders an `AsyncState`: a loading indicator, a failure alert, or the content. Always use it for a loading state in a template. Do not write your own `@switch` over `loadingState`.

[src/app/features/notes/presentation/notes-list/notes-list.html](../src/app/features/notes/presentation/notes-list/notes-list.html)

```html
<app-async-content
  class="notes-body"
  [state]="_store.listState()"
  [failureHeading]="'notesList.loadFailed' | t"
  [loadingLabel]="'notesList.loading' | t"
  (retry)="_store.reload()"
  loadingIndicator="skeleton"
  retryable
>
  <ng-template>
    <!-- rendered once the data is there -->
  </ng-template>
</app-async-content>
```

| Input / output     | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `state`            | The `AsyncState` to render. Required               |
| `failureHeading`   | Heading of the alert when loading failed. Required |
| `loadingIndicator` | `'spinner'` (default) or `'skeleton'`              |
| `loadingLabel`     | Announced to screen readers while loading          |
| `retryable`        | Shows a retry button in the failure alert          |
| `(retry)`          | Emits when that button is used                     |

The content goes into an `<ng-template>`. It is only instantiated once there is something to show, so the template inside can rely on the data being loaded. `idle` counts as content, which covers pages with nothing to load such as the form for a new note.

The host element carries `aria-busy` while loading.

During server rendering a failure also becomes the HTTP status of the page: the status of the `Failure`, or 503 when it has none. A page that could not load its data is never delivered as 200, see [SEO](seo.md#http-status).

### `app-failure-alert`

Inline presentation of a `Failure`, for errors outside a loading state. The typical case is a failed write:

[src/app/features/notes/presentation/note-editor/note-editor.html](../src/app/features/notes/presentation/note-editor/note-editor.html)

<!-- prettier-ignore -->
```html
@if (_store.mutationState().failure; as failure) {
  <app-failure-alert [failure]="failure" heading="Speichern fehlgeschlagen" />
}
```

It takes `heading`, `failure`, and optionally `retryable` with `(retry)`. The alert stays visible until the state changes, so the user can read it and try again.

The text for a kind is generic. Where a status means something specific on a page, the page passes its own text through `message`. The backend answers a wrong password with 401, for which "Du bist nicht angemeldet." would be the wrong thing to say:

[src/app/features/auth/presentation/sign-in/sign-in.html](../src/app/features/auth/presentation/sign-in/sign-in.html)

<!-- prettier-ignore -->
```html
<app-failure-alert
  [failure]="failure"
  [heading]="'signIn.failed' | t"
  [message]="_invalidCredentials() ? ('signIn.invalidCredentials' | t) : undefined"
/>
```

### Toasts

A toast disappears on its own, so it is for confirmations (`'Notiz gespeichert'`), not for failures the user has to act on. See [UI components](ui-components.md#toast).

## Unhandled errors

Errors that are not a `Failure` are bugs: a thrown exception in a component, a rejected promise nobody awaited. They end up in `AppErrorHandler`, which writes them to `AppLog` and shows nothing to the user:

[src/app/core/log/app-error-handler.ts](../src/app/core/log/app-error-handler.ts)

```ts
handleError(error: unknown): void {
  this._log.error('Unhandled error', error);
}
```

Expected errors are rendered where they happen, unexpected ones are logged. See [Logging](logging.md).

## Rules in short

- One error type: `Failure`. Stores and components never work with raw errors
- Conversion happens in `failureInterceptor` and `toFailure()`, not in repositories, stores or components
- Loading states are rendered with `app-async-content`
- Other failures are rendered with `app-failure-alert`
- Toasts confirm, they do not report failures that need a reaction
