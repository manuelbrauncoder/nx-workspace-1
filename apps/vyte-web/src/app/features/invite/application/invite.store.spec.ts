import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { AuthStore } from '@features/auth/public-api';
import { Observable, of, throwError } from 'rxjs';
import { InvitePreview, Registration, VyteEvent } from '../domain/invite';
import { InviteUseCase } from '../domain/invite.usecase';
import { InviteStore } from './invite.store';

const REGISTRATION: Registration = {
  name: 'Ada',
  email: 'ada@example.com',
  password: 'secret-pass',
};

class FakeInviteUseCase {
  preview = {
    eventTitle: 'Sommerfest',
    startsAt: new Date('2027-03-13T18:00:00.000Z'),
    allDay: false,
    timeZone: 'Europe/Berlin',
    ownerName: 'Olga',
  } as InvitePreview;
  event = { id: 'e1', title: 'Sommerfest' } as VyteEvent;
  failWith: Error | undefined;
  calls: unknown[][] = [];

  private _respond<T>(name: string, args: unknown[], value: () => T): Observable<T> {
    this.calls.push([name, ...args]);
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getByToken = (token: string) => this._respond('getByToken', [token], () => this.preview);
  accept = (token: string) => this._respond('accept', [token], () => this.event);
  signUp = (token: string, registration: Registration) =>
    this._respond('signUp', [token, registration], () => this.event);
}

describe('InviteStore', () => {
  let useCase: FakeInviteUseCase;
  let getMe: ReturnType<typeof vi.fn>;
  let store: InviteStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function setup(): void {
    TestBed.resetTestingModule();
    useCase = new FakeInviteUseCase();
    getMe = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: InviteUseCase, useValue: useCase },
        { provide: AuthStore, useValue: { getMe } },
        InviteStore,
      ],
    });
    store = TestBed.inject(InviteStore);
  }

  beforeEach(async () => {
    setup();
    store.select('tok');
    await settle();
  });

  it('loads nothing before a token is selected', async () => {
    setup();
    await settle();

    expect(store.preview()).toBeUndefined();
    expect(useCase.calls).toEqual([]);
    expect(await store.accept()).toBeUndefined();
    expect(await store.signUp(REGISTRATION)).toBeUndefined();
    expect(useCase.calls).toEqual([]);
  });

  it('loads the preview of the invite', () => {
    expect(store.preview()?.eventTitle).toBe('Sommerfest');
    expect(store.previewState().loadingState).toBe('success');
    expect(useCase.calls).toEqual([['getByToken', 'tok']]);
  });

  it('exposes a failed preview as a state and no value', async () => {
    useCase.failWith = new Failure('not-found', 'Invite not found');
    store.select('gone');
    await settle();

    expect(store.previewState().failure?.kind).toBe('not-found');
    expect(store.preview()).toBeUndefined();
  });

  it('reloads the preview', async () => {
    useCase.preview = { ...useCase.preview, eventTitle: 'Winterfest' };

    store.reload();
    await settle();

    expect(store.preview()?.eventTitle).toBe('Winterfest');
  });

  it('accepts the invite and resolves with the event', async () => {
    const event = await store.accept();

    expect(event?.id).toBe('e1');
    expect(useCase.calls.at(-1)).toEqual(['accept', 'tok']);
    expect(store.mutationState().loadingState).toBe('success');
    expect(getMe).not.toHaveBeenCalled();
  });

  it('records why accepting failed', async () => {
    useCase.failWith = new Failure('conflict', 'Team is full');

    expect(await store.accept()).toBeUndefined();

    expect(store.mutationState().failure?.kind).toBe('conflict');
  });

  it('signs up with the token and loads the signed-in user afterwards', async () => {
    const order: string[] = [];
    const signUp = useCase.signUp;
    useCase.signUp = (token, registration) => {
      order.push('signUp');
      return signUp(token, registration);
    };
    getMe.mockImplementation(async () => void order.push('getMe'));

    const event = await store.signUp(REGISTRATION);

    expect(event?.id).toBe('e1');
    expect(useCase.calls.at(-1)).toEqual(['signUp', 'tok', REGISTRATION]);
    expect(getMe).toHaveBeenCalledTimes(1);
    expect(order).toEqual(['signUp', 'getMe']);
  });

  it('does not load the signed-in user when signing up fails', async () => {
    useCase.failWith = new Failure('conflict', 'Email taken');

    expect(await store.signUp(REGISTRATION)).toBeUndefined();

    expect(getMe).not.toHaveBeenCalled();
    expect(store.mutationState().failure?.kind).toBe('conflict');
  });

  it('drops the failure when a token is selected', async () => {
    useCase.failWith = new Failure('network', 'Offline');
    await store.accept();
    expect(store.mutationState().loadingState).toBe('failure');
    useCase.failWith = undefined;

    store.select('other');

    expect(store.mutationState().loadingState).toBe('idle');
  });
});
