import { computed, inject, linkedSignal, Service } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AsyncState, asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { AuthStore } from '@features/auth/public-api';
import { map } from 'rxjs';
import { ReceivedMessage } from '../domain/admin';
import { InboxUseCase } from '../domain/inbox.usecase';

/**
 * The messages of the contact form. Provided app-wide and not in the feature routes: the bell in
 * the header and the pages of the admin area show the same list. Only an admin loads it.
 */
@Service()
export class InboxStore {
  private readonly _useCase = inject(InboxUseCase);
  private readonly _auth = inject(AuthStore);

  // Without params nothing is requested, and signing out drops what was loaded.
  private readonly _messages = rxResource({
    params: () => this._auth.isAdmin() || undefined,
    stream: () => this._useCase.getMessages(),
    defaultValue: [] as ReceivedMessage[],
  });
  private readonly _loadState = asyncState(this._messages);
  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly messages = computed(() => (this._messages.hasValue() ? this._messages.value() : []));
  /** A reload of a loaded list stays `success`, so an open page does not flash its skeleton. */
  readonly messagesState = linkedSignal<AsyncState, AsyncState>({
    source: this._loadState,
    computation: (state, previous) =>
      this._messages.status() === 'reloading' && previous?.value.loadingState === 'success'
        ? previous.value
        : state,
  });
  readonly unread = computed(() => this.messages().filter((message) => !message.read));
  readonly unreadCount = computed(() => this.unread().length);

  /** State of the most recent change or deletion of a message. */
  readonly mutationState = this._mutation.state;

  reload(): void {
    this._messages.reload();
  }

  /** Drops the failure of an earlier write, e.g. when a page opens again. */
  resetMutation(): void {
    this._mutation.reset();
  }

  async setRead(id: string, read: boolean): Promise<ReceivedMessage | undefined> {
    const message = await this._mutation.run(this._useCase.setRead(id, read));
    if (message) {
      this._patch((messages) =>
        messages.map((existing) => (existing.id === id ? message : existing)),
      );
    }
    return message;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const deleted = await this._mutation.run(this._useCase.deleteMessage(id).pipe(map(() => true)));
    if (deleted) {
      this._patch((messages) => messages.filter((message) => message.id !== id));
    }
    return deleted ?? false;
  }

  /**
   * Like `patchResource()`, but also applies the change while the list reloads: the reload started
   * before the write and would bring the old state back, `update` cancels it.
   */
  private _patch(change: (messages: ReceivedMessage[]) => ReceivedMessage[]): void {
    const status = this._messages.status();
    if (status === 'resolved' || status === 'local' || status === 'reloading') {
      this._messages.update(change);
    } else {
      this._messages.reload();
    }
  }
}
