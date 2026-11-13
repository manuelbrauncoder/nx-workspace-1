import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map, Observable } from 'rxjs';
import { Guest, GuestDraft, GuestsBulk, GuestsExportLanguage, HostAnswer } from '../domain/guest';
import { countGuests } from '../domain/guest-list';
import { GuestsUseCase } from '../domain/guests.usecase';

/**
 * State of the guest list of one event, and the event itself. Provided in the feature routes, so
 * it lives as long as the feature.
 */
@Service({ autoProvided: false })
export class GuestsStore {
  private readonly _useCase = inject(GuestsUseCase);

  private readonly _eventId = signal<string | undefined>(undefined);

  private readonly _event = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getEvent(id),
  });
  private readonly _guests = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getAll(id),
    defaultValue: [] as Guest[],
  });

  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly event = computed(() => (this._event.hasValue() ? this._event.value() : undefined));
  readonly eventState = asyncState(this._event);

  /** Sorted by name, as the API sends them. */
  readonly guests = computed(() => (this._guests.hasValue() ? this._guests.value() : []));
  readonly guestsState = asyncState(this._guests);
  /** Counted from the list, so they follow every change at once. */
  readonly counts = computed(() => countGuests(this.guests()));

  /** State of the most recent change to a guest. */
  readonly mutationState = this._mutation.state;

  /** Loads the event and its guests. */
  select(eventId: string): void {
    this._eventId.set(eventId);
    this._mutation.reset();
  }

  reload(): void {
    this._event.reload();
    this._guests.reload();
  }

  /** Drops the failure of an earlier change, e.g. when a dialog opens. */
  resetMutation(): void {
    this._mutation.reset();
  }

  exportUrl(language: GuestsExportLanguage): string | undefined {
    const id = this._eventId();
    return id ? this._useCase.exportUrl(id, language) : undefined;
  }

  async create(draft: GuestDraft): Promise<Guest | undefined> {
    const guest = await this._write((id) => this._useCase.create(id, draft));
    if (guest) {
      patchResource(this._guests, (guests) => [...guests, guest]);
    }
    return guest;
  }

  async createBulk(bulk: GuestsBulk): Promise<Guest[] | undefined> {
    const added = await this._write((id) => this._useCase.createBulk(id, bulk));
    if (added) {
      patchResource(this._guests, (guests) => [...guests, ...added]);
    }
    return added;
  }

  async update(guestId: string, draft: GuestDraft): Promise<Guest | undefined> {
    return this._replace(await this._write((id) => this._useCase.update(id, guestId, draft)));
  }

  async setResponse(guestId: string, answer: HostAnswer): Promise<Guest | undefined> {
    return this._replace(await this._write((id) => this._useCase.setResponse(id, guestId, answer)));
  }

  async renewToken(guestId: string): Promise<Guest | undefined> {
    return this._replace(await this._write((id) => this._useCase.renewToken(id, guestId)));
  }

  async renewPhotoToken(guestId: string): Promise<Guest | undefined> {
    return this._replace(await this._write((id) => this._useCase.renewPhotoToken(id, guestId)));
  }

  async remove(guestId: string): Promise<boolean> {
    const removed = await this._write((id) =>
      this._useCase.delete(id, guestId).pipe(map(() => true)),
    );
    if (removed) {
      patchResource(this._guests, (guests) => guests.filter((guest) => guest.id !== guestId));
    }
    return removed ?? false;
  }

  private async _write<T>(request: (eventId: string) => Observable<T>): Promise<T | undefined> {
    const id = this._eventId();
    return id ? this._mutation.run(request(id)) : undefined;
  }

  private _replace(guest: Guest | undefined): Guest | undefined {
    if (guest) {
      patchResource(this._guests, (guests) =>
        guests.map((existing) => (existing.id === guest.id ? guest : existing)),
      );
    }
    return guest;
  }
}
