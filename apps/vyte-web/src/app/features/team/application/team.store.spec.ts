import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { AuthStore } from '@features/auth/public-api';
import { Observable, of, throwError } from 'rxjs';
import { EditorInvite, Member, VyteEvent } from '../domain/team';
import { TeamUseCase } from '../domain/team.usecase';
import { TeamStore } from './team.store';

const member = (userId: string, role: Member['role'], name: string | null = userId): Member => ({
  userId,
  name,
  email: `${userId}@example.com`,
  role,
  joinedAt: new Date('2026-11-01T09:00:00.000Z'),
});

const invite = (id: string): EditorInvite => ({
  id,
  token: `token-${id}`,
  createdAt: new Date('2026-11-01T09:00:00.000Z'),
  expiresAt: new Date('2026-11-08T09:00:00.000Z'),
});

class FakeTeamUseCase {
  event = { id: 'e1', title: 'Sommerfest', past: false } as VyteEvent;
  members = [member('u1', 'owner'), member('u2', 'editor'), member('u3', 'editor')];
  invites = [invite('i1'), invite('i2')];
  handedOver = [member('u1', 'editor'), member('u2', 'owner'), member('u3', 'editor')];
  failWith: Error | undefined;
  calls: unknown[][] = [];

  private _respond<T>(name: string, args: unknown[], value: () => T): Observable<T> {
    this.calls.push([name, ...args]);
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }

  getEvent = (eventId: string) => this._respond('getEvent', [eventId], () => this.event);
  getMembers = (eventId: string) => this._respond('getMembers', [eventId], () => this.members);
  getInvites = (eventId: string) => this._respond('getInvites', [eventId], () => this.invites);
  createInvite = (eventId: string) => this._respond('createInvite', [eventId], () => invite('i3'));
  deleteInvite = (eventId: string, id: string) =>
    this._respond('deleteInvite', [eventId, id], () => undefined);
  removeMember = (eventId: string, userId: string) =>
    this._respond('removeMember', [eventId, userId], () => undefined);
  handOver = (eventId: string, userId: string) =>
    this._respond('handOver', [eventId, userId], () => this.handedOver);

  called(name: string): unknown[][] {
    return this.calls.filter(([called]) => called === name);
  }
}

describe('TeamStore', () => {
  let useCase: FakeTeamUseCase;
  let me: ReturnType<typeof signal<{ id: string } | undefined>>;
  let store: TeamStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function setup(userId: string | undefined, select = true): Promise<void> {
    TestBed.resetTestingModule();
    useCase = new FakeTeamUseCase();
    me = signal(userId ? { id: userId } : undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: TeamUseCase, useValue: useCase },
        { provide: AuthStore, useValue: { me } },
        TeamStore,
      ],
    });
    store = TestBed.inject(TeamStore);
    if (select) {
      store.select('e1');
    }
    await settle();
  }

  const ids = () => store.members().map((m) => m.userId);
  const inviteIds = () => store.invites().map((i) => i.id);

  describe('as owner', () => {
    beforeEach(() => setup('u1'));

    it('loads nothing before an event is selected', async () => {
      await setup('u1', false);

      expect(useCase.calls).toEqual([]);
      expect(store.event()).toBeUndefined();
      expect(store.members()).toEqual([]);
      expect(store.isOwner()).toBe(false);
    });

    it('loads the event and its members', () => {
      expect(store.event()?.title).toBe('Sommerfest');
      expect(ids()).toEqual(['u1', 'u2', 'u3']);
      expect(store.eventState().loadingState).toBe('success');
      expect(store.membersState().loadingState).toBe('success');
    });

    it('finds the signed-in user among the members and knows they own the event', () => {
      expect(store.me()?.userId).toBe('u1');
      expect(store.isOwner()).toBe(true);
    });

    it('loads the invites', () => {
      expect(inviteIds()).toEqual(['i1', 'i2']);
      expect(store.invitesState().loadingState).toBe('success');
      expect(useCase.called('getInvites')).toEqual([['getInvites', 'e1']]);
    });

    it('exposes a failed load as a state and no value', async () => {
      useCase.failWith = new Failure('not-found', 'Event not found');
      store.select('e2');
      await settle();

      expect(store.eventState().failure?.kind).toBe('not-found');
      expect(store.membersState().failure?.kind).toBe('not-found');
      expect(store.event()).toBeUndefined();
      expect(store.members()).toEqual([]);
      expect(store.me()).toBeUndefined();
    });

    it('reloads the event and the members', async () => {
      useCase.members = [member('u1', 'owner')];

      store.reload();
      await settle();

      expect(ids()).toEqual(['u1']);
    });

    it('reloads the invites', async () => {
      useCase.invites = [invite('i9')];

      store.reloadInvites();
      await settle();

      expect(inviteIds()).toEqual(['i9']);
    });

    it('puts a new invite on top', async () => {
      const created = await store.createInvite();

      expect(created?.id).toBe('i3');
      expect(inviteIds()).toEqual(['i3', 'i1', 'i2']);
      expect(store.inviteMutationState().loadingState).toBe('success');
    });

    it('drops a revoked invite', async () => {
      expect(await store.revokeInvite('i1')).toBe(true);

      expect(inviteIds()).toEqual(['i2']);
      expect(useCase.called('deleteInvite')).toEqual([['deleteInvite', 'e1', 'i1']]);
    });

    it('drops a removed member', async () => {
      expect(await store.removeMember('u2')).toBe(true);

      expect(ids()).toEqual(['u1', 'u3']);
      expect(useCase.called('removeMember')).toEqual([['removeMember', 'e1', 'u2']]);
    });

    it('replaces the members on a handover and stops being the owner', async () => {
      const members = await store.handOver('u2');

      expect(members).toEqual(useCase.handedOver);
      expect(store.members().map((m) => [m.userId, m.role])).toEqual([
        ['u1', 'editor'],
        ['u2', 'owner'],
        ['u3', 'editor'],
      ]);
      expect(store.me()?.role).toBe('editor');
      expect(store.isOwner()).toBe(false);
    });

    it('stops requesting the invites after a handover', async () => {
      await store.handOver('u2');
      await settle();
      const before = useCase.called('getInvites').length;

      useCase.invites = [invite('i9')];
      store.reloadInvites();
      await settle();

      expect(useCase.called('getInvites')).toHaveLength(before);
    });

    it('keeps the lists and records the failure in the part that failed', async () => {
      useCase.failWith = new Failure('conflict', 'Event is over');

      expect(await store.createInvite()).toBeUndefined();
      expect(await store.revokeInvite('i1')).toBe(false);
      expect(store.inviteMutationState().failure?.kind).toBe('conflict');
      expect(store.memberMutationState().loadingState).toBe('idle');

      expect(await store.removeMember('u2')).toBe(false);
      expect(await store.handOver('u2')).toBeUndefined();
      expect(store.memberMutationState().failure?.kind).toBe('conflict');

      expect(inviteIds()).toEqual(['i1', 'i2']);
      expect(ids()).toEqual(['u1', 'u2', 'u3']);
    });

    it('keeps the failure of the invites apart from the one of the members', async () => {
      useCase.failWith = new Failure('network', 'Offline');
      await store.removeMember('u2');
      useCase.failWith = undefined;
      await store.createInvite();

      expect(store.memberMutationState().failure?.kind).toBe('network');
      expect(store.inviteMutationState().loadingState).toBe('success');
    });

    it('drops the failures when another event is selected', async () => {
      useCase.failWith = new Failure('network', 'Offline');
      await store.removeMember('u2');
      await store.createInvite();
      useCase.failWith = undefined;

      store.select('e2');

      expect(store.memberMutationState().loadingState).toBe('idle');
      expect(store.inviteMutationState().loadingState).toBe('idle');
    });

    it('does nothing to write before an event is selected', async () => {
      await setup('u1', false);

      expect(await store.createInvite()).toBeUndefined();
      expect(await store.removeMember('u2')).toBe(false);
      expect(useCase.calls).toEqual([]);
    });
  });

  describe('as editor', () => {
    beforeEach(() => setup('u2'));

    it('is an editor and not the owner', () => {
      expect(store.me()?.role).toBe('editor');
      expect(store.isOwner()).toBe(false);
    });

    it('never requests the invites', async () => {
      expect(useCase.called('getInvites')).toEqual([]);
      expect(store.invites()).toEqual([]);

      store.reload();
      await settle();

      expect(useCase.called('getInvites')).toEqual([]);
    });

    it('requests the invites once a handover makes them the owner', async () => {
      useCase.members = [member('u1', 'editor'), member('u2', 'owner')];

      store.reload();
      await settle();

      expect(store.isOwner()).toBe(true);
      expect(useCase.called('getInvites')).toEqual([['getInvites', 'e1']]);
    });

    it('leaves by removing themself from the event', async () => {
      expect(await store.leave()).toBe(true);

      expect(useCase.called('removeMember')).toEqual([['removeMember', 'e1', 'u2']]);
      expect(store.memberMutationState().loadingState).toBe('success');
    });

    it('records why leaving failed', async () => {
      useCase.failWith = new Failure('conflict', 'Event is over');

      expect(await store.leave()).toBe(false);

      expect(store.memberMutationState().failure?.kind).toBe('conflict');
    });
  });

  describe('signed out or not in the team', () => {
    it('has no me and is no owner without a signed-in user', async () => {
      await setup(undefined);

      expect(store.me()).toBeUndefined();
      expect(store.isOwner()).toBe(false);
      expect(useCase.called('getInvites')).toEqual([]);
    });

    it('does not leave a team it is not part of', async () => {
      await setup('stranger');

      expect(store.me()).toBeUndefined();
      expect(await store.leave()).toBe(false);
      expect(useCase.called('removeMember')).toEqual([]);
    });

    it('follows the signed-in user', async () => {
      await setup('u2');
      expect(store.isOwner()).toBe(false);

      me.set({ id: 'u1' });

      expect(store.isOwner()).toBe(true);
    });
  });
});
