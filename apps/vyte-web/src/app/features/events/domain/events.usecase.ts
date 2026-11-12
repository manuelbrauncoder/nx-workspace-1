import { inject, Service } from '@angular/core';
import { EventsRepository } from '@api/events/events.repository';
import { Observable } from 'rxjs';
import { EventDraft, EventImage, VyteEvent } from './event';

/**
 * What the events feature can do with its data. For now it only passes the repository through.
 * It is the place to combine several API layers once the feature needs more than one.
 */
@Service({ autoProvided: false })
export class EventsUseCase {
  private readonly _repository = inject(EventsRepository);

  getAll(): Observable<VyteEvent[]> {
    return this._repository.getAll();
  }

  getById(id: string): Observable<VyteEvent> {
    return this._repository.getById(id);
  }

  create(draft: EventDraft): Observable<VyteEvent> {
    return this._repository.create(draft);
  }

  update(id: string, draft: EventDraft): Observable<VyteEvent> {
    return this._repository.update(id, draft);
  }

  delete(id: string): Observable<void> {
    return this._repository.delete(id);
  }

  /** Resolves with every image of the event, not only the new ones. */
  uploadImages(id: string, files: File[]): Observable<EventImage[]> {
    return this._repository.uploadImages(id, files);
  }

  /** `images` are all images of the event in their new order. */
  reorderImages(id: string, images: EventImage[]): Observable<EventImage[]> {
    return this._repository.reorderImages(id, images);
  }

  /** Resolves with the images that are left. */
  deleteImage(id: string, imageId: string): Observable<EventImage[]> {
    return this._repository.deleteImage(id, imageId);
  }

  /** Turns the save-the-date page on or changes its note. */
  setSaveTheDate(id: string, note: string): Observable<VyteEvent> {
    return this._repository.setSaveTheDate(id, note);
  }

  removeSaveTheDate(id: string): Observable<VyteEvent> {
    return this._repository.removeSaveTheDate(id);
  }

  /** The old link stops working. */
  renewSaveTheDateToken(id: string): Observable<VyteEvent> {
    return this._repository.renewSaveTheDateToken(id);
  }
}
