import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG_URL, AppConfigService } from './app-config';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppConfigService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the config and strips a trailing slash from the base URL', async () => {
    const loaded = service.load();
    backend.expectOne(APP_CONFIG_URL).flush({
      apiBaseUrl: 'https://api.example.com/v1/',
      environment: 'staging',
      logLevel: 'warn',
      siteUrl: 'https://example.com/',
      allowIndexing: true,
    });
    await loaded;

    expect(service.apiBaseUrl).toBe('https://api.example.com/v1');
    expect(service.environment).toBe('staging');
    expect(service.logLevel).toBe('warn');
    expect(service.siteUrl).toBe('https://example.com');
    expect(service.allowIndexing).toBe(true);
  });

  it('loads the config only once', async () => {
    const first = service.load();
    const second = service.load();
    backend.expectOne(APP_CONFIG_URL).flush({
      apiBaseUrl: '/api',
      environment: 'local',
      logLevel: 'info',
      siteUrl: 'https://example.com',
      allowIndexing: false,
    });

    expect(second).toBe(first);
    await first;
  });

  it('recognizes requests to the backend once the config is loaded', async () => {
    expect(service.isApiUrl('https://api.example.com/notes')).toBe(false);

    const loaded = service.load();
    backend.expectOne(APP_CONFIG_URL).flush({
      apiBaseUrl: 'https://api.example.com',
      environment: 'local',
      logLevel: 'info',
      siteUrl: 'https://example.com',
      allowIndexing: false,
    });
    await loaded;

    expect(service.isApiUrl('https://api.example.com/notes')).toBe(true);
    expect(service.isApiUrl('https://api.example.com.evil.test/notes')).toBe(false);
    expect(service.isApiUrl('/config/app-config.json')).toBe(false);
  });

  it('rejects a config without a base URL', async () => {
    const loaded = service.load();
    backend
      .expectOne(APP_CONFIG_URL)
      .flush({ apiUrl: '/api', environment: 'staging', logLevel: 'info' });

    await expect(loaded).rejects.toThrow(
      '"apiBaseUrl", "environment" and "siteUrl" must be strings',
    );
  });

  it('rejects a config without an environment', async () => {
    const loaded = service.load();
    backend.expectOne(APP_CONFIG_URL).flush({ apiBaseUrl: '/api', logLevel: 'info' });

    await expect(loaded).rejects.toThrow(
      '"apiBaseUrl", "environment" and "siteUrl" must be strings',
    );
  });

  it('rejects a config with an unknown log level', async () => {
    const loaded = service.load();
    backend
      .expectOne(APP_CONFIG_URL)
      .flush({ apiBaseUrl: '/api', environment: 'staging', logLevel: 'verbose' });

    await expect(loaded).rejects.toThrow('"logLevel" one of debug, info, warn, error, off');
  });

  it('rejects a config without a site URL', async () => {
    const loaded = service.load();
    backend.expectOne(APP_CONFIG_URL).flush({
      apiBaseUrl: '/api',
      environment: 'staging',
      logLevel: 'info',
      allowIndexing: false,
    });

    await expect(loaded).rejects.toThrow('"siteUrl" must be strings');
  });

  it('rejects a config whose indexing flag is not a boolean', async () => {
    const loaded = service.load();
    backend.expectOne(APP_CONFIG_URL).flush({
      apiBaseUrl: '/api',
      environment: 'staging',
      logLevel: 'info',
      siteUrl: 'https://example.com',
      allowIndexing: 'yes',
    });

    await expect(loaded).rejects.toThrow('"allowIndexing" a boolean');
  });

  it('rejects when the config file cannot be loaded', async () => {
    const loaded = service.load();
    backend.expectOne(APP_CONFIG_URL).flush(null, { status: 404, statusText: 'Not Found' });

    await expect(loaded).rejects.toBeTruthy();
  });

  it('throws when the config is read before it was loaded', () => {
    expect(() => service.apiBaseUrl).toThrow('before it finished loading');
  });

  it('falls back to the default log level before the config was loaded', () => {
    expect(service.logLevel).toBe('info');
  });
});
