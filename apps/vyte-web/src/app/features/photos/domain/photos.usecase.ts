import { inject, Service } from '@angular/core';
import { EventsRepository } from '@api/events/events.repository';
import { PhotosRepository } from '@api/photos/photos.repository';
import { Observable } from 'rxjs';
import { Photo, VyteEvent } from './photo';

/**
 * What the photo page of the hosts can do. Combines two API layers: the photos and their event,
 * whose title and state the page shows.
 */
@Service({ autoProvided: false })
export class PhotosUseCase {
  private readonly _photos = inject(PhotosRepository);
  private readonly _events = inject(EventsRepository);

  getEvent(eventId: string): Observable<VyteEvent> {
    return this._events.getById(eventId);
  }

  /** Hidden ones too, newest first. */
  getAll(eventId: string): Observable<Photo[]> {
    return this._photos.getAll(eventId);
  }

  setHidden(eventId: string, photoId: string, hidden: boolean): Observable<Photo> {
    return this._photos.setHidden(eventId, photoId, hidden);
  }

  delete(eventId: string, photoId: string): Observable<void> {
    return this._photos.delete(eventId, photoId);
  }

  photoUrl(eventId: string, photoId: string): string {
    return this._photos.photoUrl(eventId, photoId);
  }

  /** Every photo that is not hidden, as one ZIP file. */
  archiveUrl(eventId: string): string {
    return this._photos.archiveUrl(eventId);
  }
}
