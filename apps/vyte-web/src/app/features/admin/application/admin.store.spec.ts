import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { AccountInvite, User, UserRole } from '../domain/admin';
import { AdminUseCase } from '../domain/admin.usecase';
import { AdminStore } from './admin.store';

const user = (id: string, role: UserRole = 'user'): User => ({
  id,
  email: `${id}@example.com`,
  name: undefined,
  role,
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
});
const invite = (id: string, name: string): AccountInvite => ({
  id,
  name,
  token: `token-${id}`,
  expiresAt: new Date('2026-11-19T09:00:00.000Z'),
  createdAt: new Date('2026-11-12T09:00:00.000Z'),
});

class FakeAdminUseCase {
  users = [user('u1', 'admin'), user('u2')];
  invites = [invite('i1', 'Ada')];
  failWith: Error | undefined;

  private _respond<T>(value: () => T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getUsers = () => this._respond(() => [...this.users]);
  setRole = (id: string, role: UserRole) => this._respond(() => ({ ...user(id), role }));
  deleteUser = () => this._respond(() => undefined);
  revokeSessions = () => this._respond(() => undefined);
  getAccountInvites = () => this._respond(() => [...this.invites]);
  createAccountInvite = (name: string) => this._respond(() => invite('i2', name));
  deleteAccountInvite = () => this._respond(() => undefined);
}

describe('AdminStore', () => {
  let useCase: FakeAdminUseCase;
  let store: AdminStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(async () => {
    useCase = new FakeAdminUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: AdminUseCase, useValue: useCase }, AdminStore],
    });
    store = TestBed.inject(AdminStore);
    await settle();
  });

  it('loads the accounts and the open links', () => {
    expect(store.users().map((existing) => existing.id)).toEqual(['u1', 'u2']);
    expect(store.invites().map((existing) => existing.name)).toEqual(['Ada']);
    expect(store.invitesState().loadingState).toBe('success');
  });

  it('puts a new link at the top', async () => {
    const created = await store.createInvite('Grace');

    expect(created?.name).toBe('Grace');
    expect(store.invites().map((existing) => existing.name)).toEqual(['Grace', 'Ada']);
    expect(store.createState().loadingState).toBe('success');
  });

  it('removes a revoked link', async () => {
    expect(await store.revokeInvite('i1')).toBe(true);
    expect(store.invites()).toEqual([]);
  });

  it('gives creating a link a failure of its own', async () => {
    useCase.failWith = new Failure('bad-request', 'Name missing');

    expect(await store.createInvite('')).toBeUndefined();
    expect(store.createState().failure?.kind).toBe('bad-request');
    expect(store.inviteMutationState().loadingState).toBe('idle');
    expect(store.userMutationState().loadingState).toBe('idle');
  });

  it('changes the role of an account in the list', async () => {
    await store.setRole('u2', 'admin');

    expect(store.users().find((existing) => existing.id === 'u2')?.role).toBe('admin');
  });

  it('removes a deleted account and keeps the list when deleting fails', async () => {
    expect(await store.deleteUser('u2')).toBe(true);
    expect(store.users().map((existing) => existing.id)).toEqual(['u1']);

    useCase.failWith = new Failure('conflict', 'Own account');
    expect(await store.deleteUser('u1')).toBe(false);
    expect(store.userMutationState().failure?.kind).toBe('conflict');
    expect(store.users()).toHaveLength(1);
  });

  it('drops the failures of earlier writes', async () => {
    useCase.failWith = new Failure('network', 'Offline');
    await store.createInvite('Grace');
    await store.revokeInvite('i1');

    store.resetMutations();

    expect(store.createState().loadingState).toBe('idle');
    expect(store.inviteMutationState().loadingState).toBe('idle');
  });
});
