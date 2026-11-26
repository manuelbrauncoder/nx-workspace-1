import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { Invitation, RsvpAnswer, UpcomingInvitation } from '../domain/invitation';
import { RsvpUseCase } from '../domain/rsvp.usecase';
import { RsvpStore } from './rsvp.store';

const INVITATION: UpcomingInvitation = {
  past: false,
  open: true,
  event: {
    title: 'Sommerfest',
    description: '',
    locationName: null,
    address: null,
    allDay: false,
    startsAt: new Date('2027-03-13T18:00:00.000Z'),
    endsAt: null,
    timeZone: 'Europe/Berlin',
    rsvpDeadline: null,
    images: [],
    hosts: ['Anna'],
  },
  guest: {
    name: 'Ada',
    maxCompanions: 2,
    response: 'pending',
    companions: 0,
    message: null,
    respondedAt: null,
  },
};

class FakeRsvpUseCase {
  failWith: Error | undefined;
  loaded: string[] = [];

  getByToken = (token: string): Observable<Invitation> => {
    this.loaded.push(token);
    return this.failWith ? throwError(() => this.failWith) : of(INVITATION);
  };
  answer = (token: string, answer: RsvpAnswer): Observable<Invitation> =>
    this.failWith
      ? throwError(() => this.failWith)
      : of({
          ...INVITATION,
          guest: { ...INVITATION.guest, ...answer, respondedAt: new Date('2026-11-12T10:00:00Z') },
        });
  imageUrl = (token: string, imageId: string) => `images/${token}/${imageId}`;
  previewImage = (token: string) => ({ url: `preview/${token}`, width: 1200, height: 630 });
  calendarUrl = (token: string) => `calendar/${token}`;
}

describe('RsvpStore', () => {
  let useCase: FakeRsvpUseCase;
  let store: RsvpStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    useCase = new FakeRsvpUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: RsvpUseCase, useValue: useCase }, RsvpStore],
    });
    store = TestBed.inject(RsvpStore);
  });

  it('loads nothing and has no addresses before a token is selected', async () => {
    await settle();

    expect(useCase.loaded).toEqual([]);
    expect(store.invitation()).toBeUndefined();
    expect(store.imageUrl('i1')).toBeUndefined();
    expect(store.previewImage()).toBeUndefined();
    expect(store.calendarUrl()).toBeUndefined();
    expect(
      await store.answer({ response: 'declined', companions: 0, message: '' }),
    ).toBeUndefined();
  });

  it('loads the invitation of the token', async () => {
    store.select('tok');
    await settle();

    expect(useCase.loaded).toEqual(['tok']);
    expect(store.invitation()).toEqual(INVITATION);
    expect(store.invitationState().loadingState).toBe('success');
  });

  it('exposes a failed load as a state and no invitation', async () => {
    useCase.failWith = new Failure('not-found', 'Unknown token');
    store.select('bad');
    await settle();

    expect(store.invitation()).toBeUndefined();
    expect(store.invitationState().failure?.kind).toBe('not-found');
  });

  it('reloads the invitation', async () => {
    store.select('tok');
    await settle();

    store.reload();
    await settle();

    expect(useCase.loaded).toEqual(['tok', 'tok']);
  });

  it('replaces the invitation with the one the answer returns', async () => {
    store.select('tok');
    await settle();

    const saved = await store.answer({ response: 'accepted', companions: 1, message: 'Gern' });

    expect(saved?.past).toBe(false);
    const invitation = store.invitation();
    expect(invitation?.past === false && invitation.guest).toMatchObject({
      response: 'accepted',
      companions: 1,
      message: 'Gern',
    });
    expect(store.answerState().loadingState).toBe('success');
    // Replaced, not loaded again.
    expect(useCase.loaded).toEqual(['tok']);
  });

  it('keeps the invitation and records the failure when the answer fails', async () => {
    store.select('tok');
    await settle();
    useCase.failWith = new Failure('conflict', 'Answers are closed');

    expect(
      await store.answer({ response: 'accepted', companions: 0, message: '' }),
    ).toBeUndefined();

    expect(store.answerState().failure?.kind).toBe('conflict');
    expect(store.invitation()).toEqual(INVITATION);
  });

  it('drops the failure of an answer on request and with a new token', async () => {
    store.select('tok');
    await settle();
    useCase.failWith = new Failure('network', 'Offline');
    await store.answer({ response: 'declined', companions: 0, message: '' });

    store.resetAnswer();
    expect(store.answerState().loadingState).toBe('idle');

    await store.answer({ response: 'declined', companions: 0, message: '' });
    store.select('other');
    expect(store.answerState().loadingState).toBe('idle');
  });

  it('gives the addresses of an image and of the calendar file', () => {
    store.select('tok');

    expect(store.imageUrl('i1')).toBe('images/tok/i1');
    expect(store.calendarUrl()).toBe('calendar/tok');
  });

  it('gives the preview image of the token', () => {
    store.select('tok');

    expect(store.previewImage()).toEqual({ url: 'preview/tok', width: 1200, height: 630 });
  });
});
