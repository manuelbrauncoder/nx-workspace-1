import { TestBed } from '@angular/core/testing';
import { AccountInvitesRepository } from '@api/account-invites/account-invites.repository';
import { UsersRepository } from '@api/users/users.repository';
import { firstValueFrom, of } from 'rxjs';
import { AccountInvite, User } from './admin';
import { AdminUseCase } from './admin.usecase';

const USER = { id: 'u1' } as User;
const INVITE = { id: 'i1' } as AccountInvite;

describe('AdminUseCase', () => {
  const users = {
    getAll: vi.fn(() => of([USER])),
    setRole: vi.fn(() => of(USER)),
    delete: vi.fn(() => of(undefined)),
    revokeSessions: vi.fn(() => of(undefined)),
  };
  const invites = {
    getAll: vi.fn(() => of([INVITE])),
    create: vi.fn(() => of(INVITE)),
    delete: vi.fn(() => of(undefined)),
  };
  let useCase: AdminUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: UsersRepository, useValue: users },
        { provide: AccountInvitesRepository, useValue: invites },
        AdminUseCase,
      ],
    });
    useCase = TestBed.inject(AdminUseCase);
  });

  it('passes the accounts on to the users repository', async () => {
    expect(await firstValueFrom(useCase.getUsers())).toEqual([USER]);
    await firstValueFrom(useCase.setRole('u1', 'admin'));
    await firstValueFrom(useCase.revokeSessions('u1'), { defaultValue: undefined });
    await firstValueFrom(useCase.deleteUser('u1'), { defaultValue: undefined });

    expect(users.setRole).toHaveBeenCalledWith('u1', 'admin');
    expect(users.revokeSessions).toHaveBeenCalledWith('u1');
    expect(users.delete).toHaveBeenCalledWith('u1');
  });

  it('passes the account links on to their repository', async () => {
    expect(await firstValueFrom(useCase.getAccountInvites())).toEqual([INVITE]);
    await firstValueFrom(useCase.createAccountInvite('Ada'));
    await firstValueFrom(useCase.deleteAccountInvite('i1'), { defaultValue: undefined });

    expect(invites.create).toHaveBeenCalledWith('Ada');
    expect(invites.delete).toHaveBeenCalledWith('i1');
  });
});
