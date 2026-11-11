import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppConfigService } from '@core/config/app-config';
import { failureInterceptor } from '@core/http/failure.interceptor';
import { AuthStore } from './auth.store';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

const API = 'https://api.example.com';
const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

@Component({ template: '' })
class Page {}

describe('sessionExpiredInterceptor', () => {
  const isSignedIn = signal(true);
  const clearMe = vi.fn(() => isSignedIn.set(false));
  let http: HttpClient;
  let backend: HttpTestingController;
  let router: Router;
  let harness: RouterTestingHarness;

  /** Sends a request that fails and waits for a navigation it may have started. */
  async function fail(url: string, status = UNAUTHORIZED): Promise<void> {
    http.get(url).subscribe({ error: () => undefined });
    backend.expectOne(url).flush(null, status);
    await harness.fixture.whenStable();
  }

  beforeEach(async () => {
    isSignedIn.set(true);
    clearMe.mockClear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiredInterceptor, failureInterceptor])),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'events', component: Page },
          { path: 'sign-in', component: Page },
        ]),
        {
          provide: AppConfigService,
          useValue: { apiBaseUrl: API, isApiUrl: (url: string) => url.startsWith(`${API}/`) },
        },
        { provide: AuthStore, useValue: { isSignedIn, clearMe } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    harness = await RouterTestingHarness.create('/events');
  });

  afterEach(() => backend.verify());

  it('signs the user out and opens the sign-in page when the backend ended the session', async () => {
    await fail(`${API}/events`);

    expect(clearMe).toHaveBeenCalledOnce();
    expect(router.url).toBe('/sign-in?returnUrl=%2Fevents');
  });

  it('leaves other failures alone', async () => {
    await fail(`${API}/events`, { status: 403, statusText: 'Forbidden' });

    expect(clearMe).not.toHaveBeenCalled();
    expect(router.url).toBe('/events');
  });

  it('leaves a 401 of the auth endpoints alone', async () => {
    await fail(`${API}/auth/sign-in`);

    expect(clearMe).not.toHaveBeenCalled();
    expect(router.url).toBe('/events');
  });

  it('leaves a 401 of another server alone', async () => {
    await fail('https://other.example.com/thing');

    expect(clearMe).not.toHaveBeenCalled();
  });

  it('does nothing when nobody is signed in', async () => {
    isSignedIn.set(false);

    await fail(`${API}/events`);

    expect(clearMe).not.toHaveBeenCalled();
    expect(router.url).toBe('/events');
  });
});
