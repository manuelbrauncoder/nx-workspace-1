import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { User, UserRole } from '../domain/admin';
import { AdminUseCase } from '../domain/admin.usecase';
import { AdminStore } from './admin.store';

const user = (id: string, role: UserRole = 'user'): User => ({
  id,
  email: `${id}@example.com`,
  name: undefined,
  role,
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
});

class FakeAdminUseCase {
  failWith: Error | undefined;
  revokeSessions = vi.fn(() => this._respond(() => undefined));

  getUsers(): Observable<User[]> {
    return of([user('1', 'admin'), user('2')]);
  }

  setRole(id: string, role: UserRole): Observable<User> {
    return this._respond(() => user(id, role));
  }

  deleteUser(): Observable<void> {
    return this._respond(() => undefined);
  }

  private _respond<T>(value: () => T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }
}

describe('AdminStore', () => {
  let useCase: FakeAdminUseCase;
  let store: AdminStore;

  beforeEach(async () => {
    useCase = new FakeAdminUseCase();
    TestBed.configureTestingModule({
      providers: [AdminStore, { provide: AdminUseCase, useValue: useCase }],
    });
    store = TestBed.inject(AdminStore);
    await TestBed.inject(ApplicationRef).whenStable();
  });

  it('loads the users and counts the admins', () => {
    expect(store.users()).toHaveLength(2);
    expect(store.adminCount()).toBe(1);
  });

  it('replaces a user after a role change', async () => {
    await store.setRole('2', 'admin');

    expect(store.users().map((existing) => existing.role)).toEqual(['admin', 'admin']);
    expect(store.adminCount()).toBe(2);
  });

  it('keeps the list and reports the failure when a write fails', async () => {
    useCase.failWith = new Failure('conflict', 'An admin cannot change their own role');

    expect(await store.setRole('1', 'user')).toBeUndefined();

    expect(store.userMutationState().failure?.kind).toBe('conflict');
    expect(store.adminCount()).toBe(1);
  });

  it('removes a deleted user from the list', async () => {
    expect(await store.deleteUser('2')).toBe(true);

    expect(store.users().map((existing) => existing.id)).toEqual(['1']);
  });

  it('revokes sessions without changing the list', async () => {
    expect(await store.revokeSessions('2')).toBe(true);

    expect(useCase.revokeSessions).toHaveBeenCalledWith('2');
    expect(store.users()).toHaveLength(2);
  });
});
