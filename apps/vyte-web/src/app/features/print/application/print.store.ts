import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { Guest } from '../domain/print';
import { PrintUseCase } from '../domain/print.usecase';

/** The event and its guests for the print page. Provided in the feature routes. */
@Service({ autoProvided: false })
export class PrintStore {
  private readonly _useCase = inject(PrintUseCase);

  private readonly _eventId = signal<string | undefined>(undefined);

  private readonly _event = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getEvent(id),
  });
  private readonly _guests = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getGuests(id),
    defaultValue: [] as Guest[],
  });

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly event = computed(() => (this._event.hasValue() ? this._event.value() : undefined));
  readonly eventState = asyncState(this._event);
  readonly guests = computed(() => (this._guests.hasValue() ? this._guests.value() : []));
  readonly guestsState = asyncState(this._guests);

  select(eventId: string): void {
    this._eventId.set(eventId);
  }

  reload(): void {
    this._event.reload();
    this._guests.reload();
  }
}
