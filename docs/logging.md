# Logging

The app and the Express server log through two small classes, `AppLog` and `ServerLog`. Both write the same format and take their level from the runtime config. `console.*` is not used anywhere else, ESLint forbids it.

## Usage

In the Angular app, inject `AppLog`:

```ts
private readonly _log = inject(AppLog);

this._log.info('Notes loaded', notes.length);
this._log.error('Unhandled error', error);
```

In the Express server, use the `ServerLog` instance created in [apps/angular-base/src/server.ts](../apps/angular-base/src/server.ts):

```ts
serverLog.info(`Node Express server listening on http://localhost:${port}`);
```

Both offer `debug`, `info`, `warn` and `error`. The first argument is the message, everything after it is data. Pass objects and errors as data instead of building them into the string. They then stay inspectable in the browser console, and a `%` in the message is not read as a format directive.

**Log messages are always English**, even though the UI texts are German. Logs are read by developers and operations, and they are searched for.

## Format

```text
💡 2026-01-12T09:00:00.000Z INFO [app] Notes loaded 2
```

Emoji for the level, ISO timestamp, level, source, message, data.

| Level   | Emoji |
| ------- | ----- |
| `debug` | 🐛    |
| `info`  | 💡    |
| `warn`  | 🚧    |
| `error` | ❌    |

The source is `app` or `server`. It is needed because during server-side rendering the app's log lines end up in the server output next to the server's own. The two sources also have different prefix colors.

Colors are applied with CSS in the browser and with ANSI codes in a terminal. Piped output such as container logs stays free of escape codes. `NO_COLOR` switches colors off, `FORCE_COLOR` switches them on.

## Log level

The level is the `logLevel` value in `apps/angular-base/config/app-config.json`:

```json
{ "logLevel": "debug" }
```

Levels in order: `debug`, `info`, `warn`, `error`, `off`. Entries below the configured level are dropped, `off` disables logging. Because the level is runtime config, it can be changed per environment without a new build. See [API and runtime config](api-and-config.md#runtime-config).

- `AppLog` reads the level from `AppConfigService` on every call. Until the config is loaded it uses the default `info`, so logging already works during startup
- `ServerLog` gets the level once when the server starts. A changed level needs a server restart. If the config cannot be read, the server uses `info` as well
- `notice()` is for the few lines that say what is running. It writes an `info` entry at every level except `off`. The server uses it at startup for the port and for environment and log level, so a deployment that only logs warnings still shows them

## How it is built

[packages/shared/core/src/log/log.ts](../packages/shared/core/src/log/log.ts) contains the abstract base class `Log`. It owns the format, the level filter and the colors, and it is the only place in the project that talks to `console`.

A concrete logger only says who it is and where its level comes from:

[packages/shared/core/src/log/app-log.ts](../packages/shared/core/src/log/app-log.ts)

```ts
@Service()
export class AppLog extends Log {
  private readonly _config = inject(AppConfigService);

  protected readonly source = 'app';
  protected readonly color = 'cyan';

  protected get level(): LogLevel {
    return this._config.logLevel;
  }
}
```

[apps/angular-base/src/server/server-log.ts](../apps/angular-base/src/server/server-log.ts)

```ts
export class ServerLog extends Log {
  protected readonly source = 'server';
  protected readonly color = 'magenta';

  constructor(protected readonly level: LogLevel) {
    super();
  }
}
```

## `no-console`

`no-console` is an error for all TypeScript files. The one exception is the `Log` class and the specs next to it:

[eslint.config.mjs](../eslint.config.mjs)

```js
{
  // The one place that may write to the console. Everything else uses AppLog or ServerLog.
  files: ['packages/shared/core/src/log/log.ts', 'packages/shared/core/src/log/*.spec.ts'],
  rules: { 'no-console': 'off' },
},
```

A `console.log` left over from debugging therefore fails `pnpm nx lint <project>`.

## Unhandled errors

`AppErrorHandler` replaces Angular's default `ErrorHandler` and routes every unhandled error through `AppLog`:

[packages/shared/core/src/log/app-error-handler.ts](../packages/shared/core/src/log/app-error-handler.ts)

```ts
handleError(error: unknown): void {
  this._log.error('Unhandled error', error);
}
```

It shows nothing to the user. Expected errors are a `Failure` and are rendered where they happen, see [Error handling](error-handling.md). Together with `provideBrowserGlobalErrorListeners()` in `app.config.ts`, errors outside Angular's own call stack are covered too.

To send errors to a monitoring service later, this handler is the place to add it.

## Developer greeting

`provideDeveloperGreeting()` logs one `info` line in the browser console once the app has started, with the environment and the active log level. It is a quick check that the right config was loaded. It is skipped during server rendering.

## Rules in short

- No `console.*`. `AppLog` in the app, `ServerLog` in the Express server
- Messages in English, data as separate arguments
- The level comes from `logLevel` in the runtime config
- A new logger extends `Log` and does not touch `console` itself
