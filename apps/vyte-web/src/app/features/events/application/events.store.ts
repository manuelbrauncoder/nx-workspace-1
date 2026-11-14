import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { Mutation, mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map, Observable } from 'rxjs';
import { EventDraft, EventImage, VyteEvent } from '../domain/event';
import { EventsUseCase } from '../domain/events.usecase';

/** Upcoming events soonest first, then past ones latest first, as the API sorts them. */
export function sortEvents(events: VyteEvent[]): VyteEvent[] {
  const byStart = [...events].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return [
    ...byStart.filter((event) => !event.past),
    ...byStart.filter((event) => event.past).reverse(),
  ];
}

/** Feature state for events. Provided in the feature routes, so it lives as long as the feature. */
@Service({ autoProvided: false })
export class EventsStore {
  private readonly _useCase = inject(EventsUseCase);

  // Only the list page wants the list. The frame of an event provides this store as well and
  // must not load every event for it.
  private readonly _listWanted = signal(false);
  private readonly _list = rxResource({
    params: () => this._listWanted() || undefined,
    stream: () => this._useCase.getAll(),
    defaultValue: [] as VyteEvent[],
  });

  private readonly _selectedId = signal<string | undefined>(undefined);
  private readonly _detail = rxResource({
    params: () => this._selectedId(),
    stream: ({ params: id }) => this._useCase.getById(id),
  });

  private readonly _mutation = mutation();
  // Images are written after the event itself. With a state of their own, a failed upload does
  // not hide that the event was saved.
  private readonly _imageMutation = mutation();
  // A failed save the date must not read like a failed deletion of the event.
  private readonly _saveTheDateMutation = mutation();
  private readonly _photoStandMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly events = computed(() => (this._list.hasValue() ? this._list.value() : []));
  readonly upcoming = computed(() => this.events().filter((event) => !event.past));
  readonly past = computed(() => this.events().filter((event) => event.past));
  readonly isEmpty = computed(() => this.events().length === 0);
  readonly listState = asyncState(this._list);

  readonly selected = computed(() => (this._detail.hasValue() ? this._detail.value() : undefined));
  readonly detailState = asyncState(this._detail);

  /** State of the most recent create, update or delete. */
  readonly mutationState = this._mutation.state;
  /** State of the most recent upload, reordering or deletion of images. */
  readonly imageMutationState = this._imageMutation.state;
  /** State of the most recent change to the save-the-date page. */
  readonly saveTheDateState = this._saveTheDateMutation.state;
  /** State of the most recent change to the photo stand. */
  readonly photoStandState = this._photoStandMutation.state;

  /** Loads a single event. Pass `undefined` to clear the selection. */
  select(id: string | undefined): void {
    this._selectedId.set(id);
    this._mutation.reset();
    this._imageMutation.reset();
    this._saveTheDateMutation.reset();
    this._photoStandMutation.reset();
  }

  /** Starts loading the list of events, once. */
  loadList(): void {
    this._listWanted.set(true);
  }

  reload(): void {
    this._list.reload();
  }

  async create(draft: EventDraft): Promise<VyteEvent | undefined> {
    const event = await this._mutation.run(this._useCase.create(draft));
    if (event) {
      patchResource(this._list, (events) => sortEvents([...events, event]));
    }
    return event;
  }

  async update(id: string, draft: EventDraft): Promise<VyteEvent | undefined> {
    const event = await this._mutation.run(this._useCase.update(id, draft));
    if (event) {
      patchResource(this._list, (events) =>
        sortEvents([...events.filter((existing) => existing.id !== id), event]),
      );
      if (this._selectedId() === id) {
        this._detail.set(event);
      }
    }
    return event;
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this._mutation.run(this._useCase.delete(id).pipe(map(() => true)));
    if (removed) {
      patchResource(this._list, (events) => events.filter((event) => event.id !== id));
      if (this._selectedId() === id) {
        this._selectedId.set(undefined);
      }
    }
    return removed ?? false;
  }

  /** Turns the save-the-date page on or changes its note. */
  async setSaveTheDate(id: string, note: string): Promise<VyteEvent | undefined> {
    return this._writeEvent(this._saveTheDateMutation, id, this._useCase.setSaveTheDate(id, note));
  }

  async removeSaveTheDate(id: string): Promise<VyteEvent | undefined> {
    return this._writeEvent(this._saveTheDateMutation, id, this._useCase.removeSaveTheDate(id));
  }

  async renewSaveTheDateToken(id: string): Promise<VyteEvent | undefined> {
    return this._writeEvent(this._saveTheDateMutation, id, this._useCase.renewSaveTheDateToken(id));
  }

  async enablePhotoStand(id: string): Promise<VyteEvent | undefined> {
    return this._writeEvent(this._photoStandMutation, id, this._useCase.enablePhotoStand(id));
  }

  async disablePhotoStand(id: string): Promise<VyteEvent | undefined> {
    return this._writeEvent(this._photoStandMutation, id, this._useCase.disablePhotoStand(id));
  }

  async renewPhotoStandToken(id: string): Promise<VyteEvent | undefined> {
    return this._writeEvent(this._photoStandMutation, id, this._useCase.renewPhotoStandToken(id));
  }

  /** Adds images to an event. The backend stores all of them or none. */
  async uploadImages(id: string, files: File[]): Promise<EventImage[] | undefined> {
    return this._writeImages(id, this._useCase.uploadImages(id, files));
  }

  /** `images` are all images of the event in their new order. The first is the cover. */
  async reorderImages(id: string, images: EventImage[]): Promise<EventImage[] | undefined> {
    return this._writeImages(id, this._useCase.reorderImages(id, images));
  }

  async removeImage(id: string, imageId: string): Promise<EventImage[] | undefined> {
    return this._writeImages(id, this._useCase.deleteImage(id, imageId));
  }

  /** Every image request answers with all images of the event, which replace the old ones. */
  private async _writeImages(
    id: string,
    request: Observable<EventImage[]>,
  ): Promise<EventImage[] | undefined> {
    const images = await this._imageMutation.run(request);
    if (images) {
      const patch = (event: VyteEvent): VyteEvent =>
        event.id === id ? { ...event, images } : event;
      patchResource(this._list, (events) => events.map(patch));
      if (this._selectedId() === id) {
        patchResource(this._detail, (event) => event && patch(event));
      }
    }
    return images;
  }

  /**
   * Save-the-date and photo-stand requests answer with the whole event, which replaces the
   * loaded one. Each part has its own state, so a failure shows where it happened.
   */
  private async _writeEvent(
    target: Mutation,
    id: string,
    request: Observable<VyteEvent>,
  ): Promise<VyteEvent | undefined> {
    const event = await target.run(request);
    if (event) {
      patchResource(this._list, (events) =>
        events.map((existing) => (existing.id === id ? event : existing)),
      );
      if (this._selectedId() === id) {
        this._detail.set(event);
      }
    }
    return event;
  }
}
