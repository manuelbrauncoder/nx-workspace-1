import { computed, inject, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map } from 'rxjs';
import { User, UserRole } from '../domain/admin';
import { AdminUseCase } from '../domain/admin.usecase';

/**
 * State of the admin area. Provided in the feature routes, so it lives as long as the feature.
 * The users load when the area opens. The messages live in `InboxStore`.
 */
@Service({ autoProvided: false })
export class AdminStore {
  private readonly _useCase = inject(AdminUseCase);

  private readonly _users = rxResource({
    stream: () => this._useCase.getUsers(),
    defaultValue: [] as User[],
  });

  private readonly _userMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly users = computed(() => (this._users.hasValue() ? this._users.value() : []));
  readonly usersState = asyncState(this._users);
  readonly adminCount = computed(() => this.users().filter((user) => user.role === 'admin').length);

  /** State of the most recent role change, sign-out or deletion of a user. */
  readonly userMutationState = this._userMutation.state;

  reloadUsers(): void {
    this._users.reload();
  }

  /** Drops the failure of an earlier write, e.g. when a page opens again. */
  resetMutations(): void {
    this._userMutation.reset();
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
}
