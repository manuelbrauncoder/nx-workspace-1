import { computed, inject, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map } from 'rxjs';
import { ReceivedMessage, User, UserRole } from '../domain/admin';
import { AdminUseCase } from '../domain/admin.usecase';

/**
 * State of the admin area. Provided in the feature routes, so it lives as long as the feature.
 * Users and messages both load when the area opens, the hub shows how many there are.
 */
@Service({ autoProvided: false })
export class AdminStore {
  private readonly _useCase = inject(AdminUseCase);

  private readonly _users = rxResource({
    stream: () => this._useCase.getUsers(),
    defaultValue: [] as User[],
  });
  private readonly _messages = rxResource({
    stream: () => this._useCase.getMessages(),
    defaultValue: [] as ReceivedMessage[],
  });

  // The two lists sit on pages of their own, a failure on one must not show up on the other.
  private readonly _userMutation = mutation();
  private readonly _messageMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly users = computed(() => (this._users.hasValue() ? this._users.value() : []));
  readonly usersState = asyncState(this._users);
  readonly adminCount = computed(() => this.users().filter((user) => user.role === 'admin').length);

  readonly messages = computed(() => (this._messages.hasValue() ? this._messages.value() : []));
  readonly messagesState = asyncState(this._messages);
  readonly unreadCount = computed(() => this.messages().filter((message) => !message.read).length);

  /** State of the most recent role change, sign-out or deletion of a user. */
  readonly userMutationState = this._userMutation.state;
  /** State of the most recent change or deletion of a message. */
  readonly messageMutationState = this._messageMutation.state;

  reloadUsers(): void {
    this._users.reload();
  }

  reloadMessages(): void {
    this._messages.reload();
  }

  /** Drops failures of earlier writes, e.g. when a page opens again. */
  resetMutations(): void {
    this._userMutation.reset();
    this._messageMutation.reset();
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

  /** Signs the user out on every device. Changes nothing in the list. */
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

  async setRead(id: string, read: boolean): Promise<ReceivedMessage | undefined> {
    const message = await this._messageMutation.run(this._useCase.setRead(id, read));
    if (message) {
      patchResource(this._messages, (messages) =>
        messages.map((existing) => (existing.id === id ? message : existing)),
      );
    }
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const deleted = await this._messageMutation.run(
      this._useCase.deleteMessage(id).pipe(map(() => true)),
    );
    if (deleted) {
      patchResource(this._messages, (messages) => messages.filter((message) => message.id !== id));
    }
    return deleted ?? false;
  }
}
