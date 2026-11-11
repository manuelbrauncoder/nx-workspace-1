import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { AccountInviteDto } from './account-invite.dto';
import { AccountInvitesRepository } from './account-invites.repository';

const API = 'https://api.example.com';
const DTO: AccountInviteDto = {
  id: 'i/1',
  name: 'Ada',
  token: 'tok',
  expiresAt: '2026-11-18T09:00:00.000Z',
  createdAt: '2026-11-11T09:00:00.000Z',
};
const USER = {
  id: 'u1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user',
  createdAt: '2026-11-11T09:00:00.000Z',
};

describe('AccountInvitesRepository', () => {
  let repository: AccountInvitesRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: API } },
      ],
    });
    repository = TestBed.inject(AccountInvitesRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the open links of the admin API and maps them', async () => {
    const invites = firstValueFrom(repository.getAll());
    const request = backend.expectOne(`${API}/admin/account-invites`);
    request.flush({ invites: [DTO] });

    expect(request.request.method).toBe('GET');
    expect((await invites)[0].expiresAt).toEqual(new Date(DTO.expiresAt));
  });

  it('creates a link with the trimmed name', async () => {
    const invite = firstValueFrom(repository.create(' Ada '));
    const request = backend.expectOne(`${API}/admin/account-invites`);
    request.flush({ invite: DTO }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Ada' });
    expect((await invite).token).toBe('tok');
  });

  it('deletes a link and encodes its id', async () => {
    const done = firstValueFrom(repository.delete('i/1'), { defaultValue: undefined });
    const request = backend.expectOne(`${API}/admin/account-invites/i%2F1`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('loads what the page of a link shows', async () => {
    const preview = firstValueFrom(repository.getByToken('t/1'));
    backend.expectOne(`${API}/auth/account-invites/t%2F1`).flush({ invite: { name: 'Ada' } });

    expect(await preview).toEqual({ name: 'Ada' });
  });

  it('creates the account of a link and answers with the signed-in user', async () => {
    const me = firstValueFrom(
      repository.accept('tok', { name: ' Ada ', email: ' ada@example.com ', password: 'geheim12' }),
    );
    const request = backend.expectOne(`${API}/auth/account-invites/tok`);
    request.flush({ user: USER }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'geheim12',
    });
    expect((await me).email).toBe('ada@example.com');
  });
});
