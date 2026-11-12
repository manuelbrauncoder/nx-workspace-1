import { inject, Service } from '@angular/core';
import { EventsRepository } from '@api/events/events.repository';
import { GuestsRepository } from '@api/guests/guests.repository';
import { Observable } from 'rxjs';
import {
  Guest,
  GuestDraft,
  GuestsBulk,
  GuestsExportLanguage,
  HostAnswer,
  VyteEvent,
} from './guest';

/**
 * What the guest list can do. Combines two API layers: the guests themselves and their event,
 * whose title, time zone and state the page shows.
 */
@Service({ autoProvided: false })
export class GuestsUseCase {
  private readonly _guests = inject(GuestsRepository);
  private readonly _events = inject(EventsRepository);

  getEvent(eventId: string): Observable<VyteEvent> {
    return this._events.getById(eventId);
  }

  getAll(eventId: string): Observable<Guest[]> {
    return this._guests.getAll(eventId);
  }

  create(eventId: string, draft: GuestDraft): Observable<Guest> {
    return this._guests.create(eventId, draft);
  }

  /** All or nothing, resolves with the new guests only. */
  createBulk(eventId: string, bulk: GuestsBulk): Observable<Guest[]> {
    return this._guests.createBulk(eventId, bulk);
  }

  update(eventId: string, guestId: string, draft: GuestDraft): Observable<Guest> {
    return this._guests.update(eventId, guestId, draft);
  }

  setResponse(eventId: string, guestId: string, answer: HostAnswer): Observable<Guest> {
    return this._guests.setResponse(eventId, guestId, answer);
  }

  delete(eventId: string, guestId: string): Observable<void> {
    return this._guests.delete(eventId, guestId);
  }

  /** The old link of the guest stops working. */
  renewToken(eventId: string, guestId: string): Observable<Guest> {
    return this._guests.renewToken(eventId, guestId);
  }

  exportUrl(eventId: string, language: GuestsExportLanguage): string {
    return this._guests.exportUrl(eventId, language);
  }
}
