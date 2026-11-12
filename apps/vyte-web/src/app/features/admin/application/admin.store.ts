import { computed, inject, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map } from 'rxjs';
import { AccountInvite, User, UserRole } from '../domain/admin';
import { AdminUseCase } from '../domain/admin.usecase';

/**
 * State of the admin area: the accounts and the open account links. Provided in the feature
 * routes, so it lives as long as the feature.
 */
@Service({ autoProvided: false })
export class AdminStore {
  private readonly _useCase = inject(AdminUseCase);

  private readonly _users = rxResource({
    stream: () => this._useCase.getUsers(),
    defaultValue: [] as User[],
  });
  private readonly _invites = rxResource({
    stream: () => this._useCase.getAccountInvites(),
    defaultValue: [] as AccountInvite[],
  });

  // Each part of the page shows its own failure: the form, the links and the accounts.
  private readonly _createMutation = mutation();
  private readonly _inviteMutation = mutation();
  private readonly _userMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly users = computed(() => (this._users.hasValue() ? this._users.value() : []));
  readonly usersState = asyncState(this._users);

  readonly invites = computed(() => (this._invites.hasValue() ? this._invites.value() : []));
  readonly invitesState = asyncState(this._invites);

  /** State of the most recent new account link. */
  readonly createState = this._createMutation.state;
  /** State of the most recent revoked account link. */
  readonly inviteMutationState = this._inviteMutation.state;
  /** State of the most recent role change, sign-out or deletion of an account. */
  readonly userMutationState = this._userMutation.state;

  reloadUsers(): void {
    this._users.reload();
  }

  reloadInvites(): void {
    this._invites.reload();
  }

  /** Drops failures of earlier writes, e.g. when the page opens again. */
  resetMutations(): void {
    this._createMutation.reset();
    this._inviteMutation.reset();
    this._userMutation.reset();
  }

  /** The new link goes to the top of the open links. */
  async createInvite(name: string): Promise<AccountInvite | undefined> {
    const invite = await this._createMutation.run(this._useCase.createAccountInvite(name));
    if (invite) {
      patchResource(this._invites, (invites) => [invite, ...invites]);
    }
    return invite;
  }

  async revokeInvite(id: string): Promise<boolean> {
    const revoked = await this._inviteMutation.run(
      this._useCase.deleteAccountInvite(id).pipe(map(() => true)),
    );
    if (revoked) {
      patchResource(this._invites, (invites) => invites.filter((invite) => invite.id !== id));
    }
    return revoked ?? false;
  }

  async setRole(id: string, role: UserRole): Promise<User | undefined> {
    const user = await this._userMutation.run(this._useCase.setRole(id, role));
    if (user) {
      patchResource(this._users, (users) =>
        users.map((existing) => (existing.id === id ? user : existing)),
      );
    }
    return user;
  }

  /** Signs the account out on every device. Changes nothing in the list. */
  async revokeSessions(id: string): Promise<boolean> {
    const done = await this._userMutation.run(
      this._useCase.revokeSessions(id).pipe(map(() => true)),
    );
    return done ?? false;
  }

  async deleteUser(id: string): Promise<boolean> {
    const deleted = await this._userMutation.run(
      this._useCase.deleteUser(id).pipe(map(() => true)),
    );
    if (deleted) {
      patchResource(this._users, (users) => users.filter((user) => user.id !== id));
    }
    return deleted ?? false;
  }
}
