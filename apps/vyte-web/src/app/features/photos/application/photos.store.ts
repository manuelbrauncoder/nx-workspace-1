import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map } from 'rxjs';
import { Photo } from '../domain/photo';
import { PhotosUseCase } from '../domain/photos.usecase';

/**
 * State of the photos of one event as its hosts see them, and the event itself. Provided in the
 * feature routes, so it lives as long as the feature.
 */
@Service({ autoProvided: false })
export class PhotosStore {
  private readonly _useCase = inject(PhotosUseCase);

  private readonly _eventId = signal<string | undefined>(undefined);

  private readonly _event = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getEvent(id),
  });
  private readonly _photos = rxResource({
    params: () => this._eventId(),
    stream: ({ params: id }) => this._useCase.getAll(id),
    defaultValue: [] as Photo[],
  });
  private readonly _mutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly event = computed(() => (this._event.hasValue() ? this._event.value() : undefined));
  readonly eventState = asyncState(this._event);
  /** Newest first, as the API sends them. */
  readonly photos = computed(() => (this._photos.hasValue() ? this._photos.value() : []));
  readonly photosState = asyncState(this._photos);
  readonly hiddenCount = computed(() => this.photos().filter((photo) => photo.hidden).length);
  /** Only visible photos go into the ZIP. */
  readonly visibleCount = computed(() => this.photos().length - this.hiddenCount());

  /** State of the most recent hide, show or delete. */
  readonly mutationState = this._mutation.state;

  select(eventId: string): void {
    this._eventId.set(eventId);
    this._mutation.reset();
  }

  reload(): void {
    this._event.reload();
    this._photos.reload();
  }

  photoUrl(photoId: string): string | undefined {
    const id = this._eventId();
    return id ? this._useCase.photoUrl(id, photoId) : undefined;
  }

  archiveUrl(): string | undefined {
    const id = this._eventId();
    return id ? this._useCase.archiveUrl(id) : undefined;
  }

  async setHidden(photoId: string, hidden: boolean): Promise<Photo | undefined> {
    const id = this._eventId();
    const photo = id
      ? await this._mutation.run(this._useCase.setHidden(id, photoId, hidden))
      : undefined;
    if (photo) {
      patchResource(this._photos, (photos) =>
        photos.map((existing) => (existing.id === photo.id ? photo : existing)),
      );
    }
    return photo;
  }

  async remove(photoId: string): Promise<boolean> {
    const id = this._eventId();
    const removed = id
      ? await this._mutation.run(this._useCase.delete(id, photoId).pipe(map(() => true)))
      : undefined;
    if (removed) {
      patchResource(this._photos, (photos) => photos.filter((photo) => photo.id !== photoId));
    }
    return removed ?? false;
  }
}
