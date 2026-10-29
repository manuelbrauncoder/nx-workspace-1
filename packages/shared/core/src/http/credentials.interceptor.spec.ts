import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../config/app-config';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  function setup(incoming?: Request) {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AppConfigService,
          useValue: { isApiUrl: (url: string) => url.startsWith('https://api.example.com/') },
        },
        { provide: REQUEST, useValue: incoming ?? null },
      ],
    });
    return {
      http: TestBed.inject(HttpClient),
      backend: TestBed.inject(HttpTestingController),
    };
  }

  it('sends credentials with a request to the backend', () => {
    const { http, backend } = setup();

    http.get('https://api.example.com/notes').subscribe();
    const { request } = backend.expectOne('https://api.example.com/notes');

    expect(request.withCredentials).toBe(true);
    expect(request.headers.has('Cookie')).toBe(false);
  });

  it('leaves every other request alone', () => {
    const incoming = new Request('https://example.com/notes', { headers: { cookie: 'sid=abc' } });
    const { http, backend } = setup(incoming);

    http.get('/config/app-config.json').subscribe();
    const { request } = backend.expectOne('/config/app-config.json');

    expect(request.withCredentials).toBe(false);
    expect(request.headers.has('Cookie')).toBe(false);
  });

  it('passes the cookies of the rendered request on to the backend on the server', () => {
    const incoming = new Request('https://example.com/notes', { headers: { cookie: 'sid=abc' } });
    const { http, backend } = setup(incoming);

    http.get('https://api.example.com/auth/me').subscribe();
    const { request } = backend.expectOne('https://api.example.com/auth/me');

    expect(request.headers.get('Cookie')).toBe('sid=abc');
  });
});
