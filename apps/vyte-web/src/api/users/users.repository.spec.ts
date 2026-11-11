import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { UserDto } from './user.dto';
import { UsersRepository } from './users.repository';

const DTO: UserDto = {
  id: 'a/b',
  email: 'ada@example.com',
  name: null,
  role: 'user',
  createdAt: '2026-01-12T09:00:00.000Z',
};

describe('UsersRepository', () => {
  let repository: UsersRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(UsersRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads all users and maps them', async () => {
    const users = firstValueFrom(repository.getAll());
    const request = backend.expectOne('https://api.example.com/admin/users');
    request.flush({ users: [DTO] });

    expect(request.request.method).toBe('GET');
    expect(await users).toEqual([
      {
        id: 'a/b',
        email: 'ada@example.com',
        name: undefined,
        role: 'user',
        createdAt: new Date(DTO.createdAt),
      },
    ]);
  });

  it('changes the role with PATCH and encodes the id', async () => {
    const user = firstValueFrom(repository.setRole('a/b', 'admin'));
    const request = backend.expectOne('https://api.example.com/admin/users/a%2Fb');
    request.flush({ user: { ...DTO, role: 'admin' } });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ role: 'admin' });
    expect((await user).role).toBe('admin');
  });

  it('deletes a user with DELETE', async () => {
    const done = firstValueFrom(repository.delete('1'), { defaultValue: undefined });
    const request = backend.expectOne('https://api.example.com/admin/users/1');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('revokes the sessions of a user with DELETE', async () => {
    const done = firstValueFrom(repository.revokeSessions('1'), { defaultValue: undefined });
    const request = backend.expectOne('https://api.example.com/admin/users/1/sessions');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });
});
