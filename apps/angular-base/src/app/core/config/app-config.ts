import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DEFAULT_LOG_LEVEL, isLogLevel, LOG_LEVELS, LogLevel } from '../log/log-level';

/** Shape of `config/app-config.json`, which is mounted into the container at runtime. */
export interface AppConfig {
  apiBaseUrl: string;
  /** Name of the deployment the app runs in, e.g. `local` or `production`. */
  environment: string;
  /** Entries below this level are not logged, on the client and on the server. */
  logLevel: LogLevel;
  /** Public origin of the app, e.g. `https://example.com`. Canonical and social URLs build on it. */
  siteUrl: string;
  /** Whether search engines may index this deployment. `false` everywhere but production. */
  allowIndexing: boolean;
}

export const APP_CONFIG_URL = '/config/app-config.json';

export const isAppConfig = (value: unknown): value is AppConfig =>
  typeof value === 'object' &&
  value !== null &&
  'apiBaseUrl' in value &&
  typeof value.apiBaseUrl === 'string' &&
  'environment' in value &&
  typeof value.environment === 'string' &&
  'logLevel' in value &&
  isLogLevel(value.logLevel) &&
  'siteUrl' in value &&
  typeof value.siteUrl === 'string' &&
  'allowIndexing' in value &&
  typeof value.allowIndexing === 'boolean';

/** Removes trailing slashes, so URLs can be joined with a path that starts with one. */
const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

/** Brings a valid config into the form the app and the server work with. */
export const normalizeAppConfig = (config: AppConfig): AppConfig => ({
  ...config,
  apiBaseUrl: withoutTrailingSlash(config.apiBaseUrl),
  siteUrl: withoutTrailingSlash(config.siteUrl),
});

@Service()
export class AppConfigService {
  private readonly _http = inject(HttpClient);
  private _config: AppConfig | undefined;
  private _loading: Promise<void> | undefined;

  /** Base URL of the backend without a trailing slash. */
  get apiBaseUrl(): string {
    return this._loaded.apiBaseUrl;
  }

  get environment(): string {
    return this._loaded.environment;
  }

  /** Unlike the other values this never throws, so logging already works while the app starts. */
  get logLevel(): LogLevel {
    return this._config?.logLevel ?? DEFAULT_LOG_LEVEL;
  }

  /** Public origin of the app without a trailing slash. */
  get siteUrl(): string {
    return this._loaded.siteUrl;
  }

  get allowIndexing(): boolean {
    return this._loaded.allowIndexing;
  }

  /**
   * Whether a request goes to the backend. `false` while the config is still loading, so
   * interceptors can ask before the first render.
   */
  isApiUrl(url: string): boolean {
    const base = this._config?.apiBaseUrl;
    return base !== undefined && (url === base || url.startsWith(`${base}/`));
  }

  private get _loaded(): AppConfig {
    if (!this._config) {
      throw new Error('App config was read before it finished loading.');
    }
    return this._config;
  }

  /**
   * Runs as an app initializer, so the config is available before the first render. Every call
   * returns the same promise, so other initializers can wait for the config.
   */
  load(): Promise<void> {
    return (this._loading ??= this._fetch());
  }

  private async _fetch(): Promise<void> {
    const raw = await firstValueFrom(this._http.get<unknown>(APP_CONFIG_URL));
    if (!isAppConfig(raw)) {
      throw new Error(
        `${APP_CONFIG_URL} is invalid: "apiBaseUrl", "environment" and "siteUrl" must be strings, ` +
          `"allowIndexing" a boolean, "logLevel" one of ${LOG_LEVELS.join(', ')}.`,
      );
    }
    this._config = normalizeAppConfig(raw);
  }
}
