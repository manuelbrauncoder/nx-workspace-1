import { inject, Service } from '@angular/core';
import { EventsRepository } from '@api/events/events.repository';
import { GuestsRepository } from '@api/guests/guests.repository';
import { Observable } from 'rxjs';
import { Guest, VyteEvent } from './print';

/**
 * What the print page needs: the event with its photo stand and the guests with their photo
 * links. Combines two API layers.
 */
@Service({ autoProvided: false })
export class PrintUseCase {
  private readonly _events = inject(EventsRepository);
  private readonly _guests = inject(GuestsRepository);

  getEvent(eventId: string): Observable<VyteEvent> {
    return this._events.getById(eventId);
  }

  getGuests(eventId: string): Observable<Guest[]> {
    return this._guests.getAll(eventId);
  }
}
