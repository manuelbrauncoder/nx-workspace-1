import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { AppLog } from '@core/log/app-log';
import { Observable, of, throwError } from 'rxjs';
import { AuthUseCase } from '../domain/auth.usecase';
import { Me } from '../domain/me';
import { AuthStore } from './auth.store';

const ME: Me = {
  id: '1',
  email: 'ada@example.com',
  name: 'Ada',
  role: 'user',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
};
const CREDENTIALS = { email: 'ada@example.com', password: 'geheim12' };

class FakeAuthUseCase {
  current: Me | undefined = ME;
  failWith: Error | undefined;

  private _respond<T>(value: T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value);
  }

  getMe(): Observable<Me | undefined> {
    return this._respond(this.current);
  }

  signIn(): Observable<Me> {
    return this._respond(ME);
  }

  signOut(): Observable<void> {
    return this._respond(undefined);
  }

  acceptAccountInvite(): Observable<Me> {
    return this._respond(ME);
  }
}

describe('AuthStore', () => {
  let useCase: FakeAuthUseCase;
  let store: AuthStore;
  const log = { warn: vi.fn() };

  beforeEach(() => {
    log.warn.mockReset();
    useCase = new FakeAuthUseCase();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthUseCase, useValue: useCase },
        { provide: AppLog, useValue: log },
      ],
    });
    store = TestBed.inject(AuthStore);
  });

  it('starts signed out', () => {
    expect(store.me()).toBeUndefined();
    expect(store.isSignedIn()).toBe(false);
    expect(store.isAdmin()).toBe(false);
  });

  it('loads the signed-in user', async () => {
    await store.getMe();

    expect(store.me()).toBe(ME);
    expect(store.isSignedIn()).toBe(true);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('stays signed out without a warning when nobody is signed in', async () => {
    useCase.current = undefined;

    await store.getMe();

    expect(store.isSignedIn()).toBe(false);
    expect(log.warn).not.toHaveBeenCalled();
  });

  it('stays signed out and logs when the session cannot be loaded', async () => {
    const failure = new Failure('network', 'The server cannot be reached.');
    useCase.failWith = failure;

    await store.getMe();

    expect(store.isSignedIn()).toBe(false);
    expect(log.warn).toHaveBeenCalledWith(expect.any(String), failure);
  });

  it('recognizes an admin', async () => {
    useCase.current = { ...ME, role: 'admin' };

    await store.getMe();

    expect(store.isAdmin()).toBe(true);
  });

  it('signs in', async () => {
    expect(await store.signIn(CREDENTIALS)).toBe(ME);

    expect(store.me()).toBe(ME);
    expect(store.mutationState().loadingState).toBe('success');
  });

  it('reports a failed sign-in and stays signed out', async () => {
    const failure = new Failure('unauthorized', 'Invalid credentials');
    useCase.failWith = failure;

    expect(await store.signIn(CREDENTIALS)).toBeUndefined();

    expect(store.isSignedIn()).toBe(false);
    expect(store.mutationState()).toEqual({ loadingState: 'failure', failure });
  });

  it('drops the failure of an earlier attempt', async () => {
    useCase.failWith = new Failure('unauthorized', 'Invalid credentials');
    await store.signIn(CREDENTIALS);

    store.resetMutation();

    expect(store.mutationState().loadingState).toBe('idle');
  });

  it('signs out', async () => {
    await store.getMe();

    expect(await store.signOut()).toBe(true);
    expect(store.isSignedIn()).toBe(false);
  });

  it('stays signed in when signing out fails, without touching the form state', async () => {
    await store.getMe();
    useCase.failWith = new Failure('network', 'The server cannot be reached.');

    expect(await store.signOut()).toBe(false);

    expect(store.isSignedIn()).toBe(true);
    expect(store.signOutState().loadingState).toBe('failure');
    expect(store.mutationState().loadingState).toBe('idle');
  });

  it('forgets the user without a request', async () => {
    await store.getMe();

    store.clearMe();

    expect(store.isSignedIn()).toBe(false);
  });

  it('is signed in after creating the account of a link', async () => {
    const me = await store.acceptAccountInvite('tok', { ...CREDENTIALS, name: 'Ada' });

    expect(me).toBe(ME);
    expect(store.me()).toBe(ME);
    expect(store.mutationState().loadingState).toBe('success');
  });

  it('stays signed out when the account of a link cannot be created', async () => {
    useCase.failWith = new Failure('conflict', 'Email taken');

    expect(await store.acceptAccountInvite('tok', { ...CREDENTIALS, name: '' })).toBeUndefined();
    expect(store.isSignedIn()).toBe(false);
    expect(store.mutationState().failure?.kind).toBe('conflict');
  });
});
