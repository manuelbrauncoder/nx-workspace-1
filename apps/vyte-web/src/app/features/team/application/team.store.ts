import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { Mutation, mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { AuthStore } from '@features/auth/public-api';
import { map, Observable } from 'rxjs';
import { EditorInvite, Member } from '../domain/team';
import { TeamUseCase } from '../domain/team.usecase';

/**
 * State of the team of one event: the event, its members and, for the owner, the open invites.
 * Provided in the feature routes, so it lives as long as the feature.
 */
@Service({ autoProvided: false })
export class TeamStore {
  private readonly _useCase = inject(TeamUseCase);
  private readonly _auth = inject(AuthStore);

  private readonly _eventId = signal<string | undefined>(undefined);

  private readonly _event = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getEvent(id),
  });
  private readonly _members = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getMembers(id),
    defaultValue: [] as Member[],
  });

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly event = computed(() => (this._event.hasValue() ? this._event.value() : undefined));
  readonly eventState = asyncState(this._event);
  readonly members = computed(() => (this._members.hasValue() ? this._members.value() : []));
  readonly membersState = asyncState(this._members);

  /** The signed-in user in this team. From the members, so it follows a handover at once. */
  readonly me = computed(() => this.members().find((m) => m.userId === this._auth.me()?.id));
  readonly isOwner = computed(() => this.me()?.role === 'owner');

  /** Only the owner may see the invites, the API refuses everyone else with a 403. */
  private readonly _invites = rxResource({
    params: () => (this.isOwner() ? this._eventId() : undefined),
    stream: ({ params: id }) => this._useCase.getInvites(id),
    defaultValue: [] as EditorInvite[],
  });
  readonly invites = computed(() => (this._invites.hasValue() ? this._invites.value() : []));
  readonly invitesState = asyncState(this._invites);

  // Each part of the page shows its own failure: the members and the invites.
  private readonly _memberMutation = mutation();
  private readonly _inviteMutation = mutation();

  /** State of the most recent removal, handover or leaving. */
  readonly memberMutationState = this._memberMutation.state;
  /** State of the most recent new or revoked invite. */
  readonly inviteMutationState = this._inviteMutation.state;

  select(eventId: string): void {
    this._eventId.set(eventId);
    this._memberMutation.reset();
    this._inviteMutation.reset();
  }

  reload(): void {
    this._event.reload();
    this._members.reload();
  }

  reloadInvites(): void {
    this._invites.reload();
  }

  /** The new link goes to the top of the open links. */
  async createInvite(): Promise<EditorInvite | undefined> {
    const invite = await this._run(this._inviteMutation, (id) => this._useCase.createInvite(id));
    if (invite) {
      patchResource(this._invites, (invites) => [invite, ...invites]);
    }
    return invite;
  }

  async revokeInvite(inviteId: string): Promise<boolean> {
    const revoked = await this._run(this._inviteMutation, (id) =>
      this._useCase.deleteInvite(id, inviteId).pipe(map(() => true)),
    );
    if (revoked) {
      patchResource(this._invites, (invites) => invites.filter((i) => i.id !== inviteId));
    }
    return revoked ?? false;
  }

  async removeMember(userId: string): Promise<boolean> {
    const removed = await this._run(this._memberMutation, (id) =>
      this._useCase.removeMember(id, userId).pipe(map(() => true)),
    );
    if (removed) {
      patchResource(this._members, (members) => members.filter((m) => m.userId !== userId));
    }
    return removed ?? false;
  }

  /** The editor becomes owner, the signed-in owner an editor. The invites are then not theirs. */
  async handOver(userId: string): Promise<Member[] | undefined> {
    const members = await this._run(this._memberMutation, (id) =>
      this._useCase.handOver(id, userId),
    );
    if (members) {
      this._members.set(members);
    }
    return members;
  }

  /** The signed-in editor leaves. The page then has nothing left to show. */
  async leave(): Promise<boolean> {
    const me = this.me();
    if (!me) {
      return false;
    }
    const left = await this._run(this._memberMutation, (id) =>
      this._useCase.removeMember(id, me.userId).pipe(map(() => true)),
    );
    return left ?? false;
  }

  private async _run<T>(
    target: Mutation,
    request: (eventId: string) => Observable<T>,
  ): Promise<T | undefined> {
    const id = this._eventId();
    return id ? target.run(request(id)) : undefined;
  }
}
