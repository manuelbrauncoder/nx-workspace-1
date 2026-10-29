import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { firstValueFrom } from 'rxjs';
import { failureInterceptor } from './failure.interceptor';

describe('failureInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([failureInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('rejects a failed request with a failure', async () => {
    const request = firstValueFrom(http.get('/api/thing')).catch((error: unknown) => error);
    backend
      .expectOne('/api/thing')
      .flush({ error: { message: 'Validation failed' } }, { status: 400, statusText: 'Bad' });

    const error = await request;
    expect(error).toBeInstanceOf(Failure);
    expect(error).toMatchObject({
      kind: 'bad-request',
      status: 400,
      message: 'Validation failed',
    });
  });

  it('reports an unreachable server as a network failure', async () => {
    const request = firstValueFrom(http.get('/api/thing')).catch((error: unknown) => error);
    backend.expectOne('/api/thing').error(new ProgressEvent('error'));

    expect(await request).toMatchObject({ kind: 'network', status: 0 });
  });

  it('leaves successful responses untouched', async () => {
    const request = firstValueFrom(http.get('/api/thing'));
    backend.expectOne('/api/thing').flush({ ok: true });

    expect(await request).toEqual({ ok: true });
  });
});
