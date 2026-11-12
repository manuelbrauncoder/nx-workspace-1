import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { of, throwError } from 'rxjs';
import { AuthUseCase } from '../domain/auth.usecase';
import { WelcomeStore } from './welcome.store';

describe('WelcomeStore', () => {
  const getAccountInvite = vi.fn();
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function create(): WelcomeStore {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthUseCase, useValue: { getAccountInvite } }, WelcomeStore],
    });
    return TestBed.inject(WelcomeStore);
  }

  beforeEach(() => getAccountInvite.mockReset());

  it('loads whom the link is for', async () => {
    getAccountInvite.mockReturnValue(of({ name: 'Ada' }));
    const store = create();

    store.select('tok');
    await settle();

    expect(getAccountInvite).toHaveBeenCalledWith('tok');
    expect(store.invite()).toEqual({ name: 'Ada' });
    expect(store.inviteState().loadingState).toBe('success');
  });

  it('reports a link that is unknown, used or expired', async () => {
    getAccountInvite.mockReturnValue(throwError(() => new Failure('not-found', 'Gone')));
    const store = create();

    store.select('tok');
    await settle();

    expect(store.invite()).toBeUndefined();
    expect(store.inviteState().failure?.kind).toBe('not-found');
  });
});
