import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { failureInterceptor } from '@core/http/failure.interceptor';
import { firstValueFrom } from 'rxjs';
import { AuthRepository } from './auth.repository';
import { MeResponseDto } from './me.dto';

const RESPONSE: MeResponseDto = {
  user: {
    id: '1',
    email: 'ada@example.com',
    name: null,
    role: 'user',
    createdAt: '2026-01-12T09:00:00.000Z',
  },
};
const ERROR = { error: { message: 'Not authenticated' } };

describe('AuthRepository', () => {
  let repository: AuthRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([failureInterceptor])),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(AuthRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the signed-in user and maps it', async () => {
    const me = firstValueFrom(repository.getMe());
    const request = backend.expectOne('https://api.example.com/auth/me');
    request.flush(RESPONSE);

    expect(request.request.method).toBe('GET');
    expect(await me).toMatchObject({
      email: 'ada@example.com',
      name: undefined,
      createdAt: new Date(RESPONSE.user.createdAt),
    });
  });

  it('answers with undefined when nobody is signed in', async () => {
    const me = firstValueFrom(repository.getMe());
    backend
      .expectOne('https://api.example.com/auth/me')
      .flush(ERROR, { status: 401, statusText: 'Unauthorized' });

    expect(await me).toBeUndefined();
  });

  it('passes every other failure of loading the user on', async () => {
    const me = firstValueFrom(repository.getMe());
    backend
      .expectOne('https://api.example.com/auth/me')
      .flush(null, { status: 500, statusText: 'Server Error' });

    await expect(me).rejects.toMatchObject({ kind: 'server' });
  });

  it('signs in with POST', async () => {
    const me = firstValueFrom(
      repository.signIn({ email: ' ada@example.com ', password: 'geheim12' }),
    );
    const request = backend.expectOne('https://api.example.com/auth/sign-in');
    request.flush(RESPONSE);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ada@example.com', password: 'geheim12' });
    expect((await me).id).toBe('1');
  });

  it('rejects wrong credentials', async () => {
    const me = firstValueFrom(repository.signIn({ email: 'ada@example.com', password: 'falsch' }));
    backend
      .expectOne('https://api.example.com/auth/sign-in')
      .flush(ERROR, { status: 401, statusText: 'Unauthorized' });

    await expect(me).rejects.toMatchObject({ kind: 'unauthorized' });
  });

  it('signs up with POST', async () => {
    const me = firstValueFrom(
      repository.signUp({ name: '', email: 'ada@example.com', password: 'geheim12' }),
    );
    const request = backend.expectOne('https://api.example.com/auth/sign-up');
    request.flush(RESPONSE, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ada@example.com', password: 'geheim12' });
    expect((await me).email).toBe('ada@example.com');
  });

  it('signs out with POST', async () => {
    const done = firstValueFrom(repository.signOut(), { defaultValue: undefined });
    const request = backend.expectOne('https://api.example.com/auth/sign-out');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('POST');
    await done;
  });
});
