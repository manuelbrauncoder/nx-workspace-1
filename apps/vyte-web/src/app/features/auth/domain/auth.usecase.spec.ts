import { TestBed } from '@angular/core/testing';
import { AccountInvitesRepository } from '@api/account-invites/account-invites.repository';
import { AuthRepository } from '@api/auth/auth.repository';
import { firstValueFrom, of } from 'rxjs';
import { AuthUseCase } from './auth.usecase';
import { Me } from './me';

const ME: Me = {
  id: '1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
};
const CREDENTIALS = { email: 'ada@example.com', password: 'geheim12' };

describe('AuthUseCase', () => {
  const repository = {
    getMe: vi.fn(() => of(ME)),
    signIn: vi.fn(() => of(ME)),
    signOut: vi.fn(() => of(undefined)),
  };
  const accountInvites = {
    getByToken: vi.fn(() => of({ name: 'Ada' })),
    accept: vi.fn(() => of(ME)),
  };
  let useCase: AuthUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthRepository, useValue: repository },
        { provide: AccountInvitesRepository, useValue: accountInvites },
      ],
    });
    useCase = TestBed.inject(AuthUseCase);
  });

  it('loads the signed-in user from the repository', async () => {
    expect(await firstValueFrom(useCase.getMe())).toBe(ME);
  });

  it('passes signing in and out on to the repository', async () => {
    await firstValueFrom(useCase.signIn(CREDENTIALS));
    await firstValueFrom(useCase.signOut());

    expect(repository.signIn).toHaveBeenCalledWith(CREDENTIALS);
    expect(repository.signOut).toHaveBeenCalledOnce();
  });

  it('passes an account link on to its repository', async () => {
    const registration = { ...CREDENTIALS, name: 'Ada' };

    expect(await firstValueFrom(useCase.getAccountInvite('tok'))).toEqual({ name: 'Ada' });
    expect(await firstValueFrom(useCase.acceptAccountInvite('tok', registration))).toBe(ME);
    expect(accountInvites.getByToken).toHaveBeenCalledWith('tok');
    expect(accountInvites.accept).toHaveBeenCalledWith('tok', registration);
  });
});
