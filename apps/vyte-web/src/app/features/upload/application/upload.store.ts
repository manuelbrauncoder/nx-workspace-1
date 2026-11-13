import { isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, PLATFORM_ID, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Failure } from '@core/failure/failure';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { switchMap } from 'rxjs';
import { PickedPhotos, pickPhotos } from '../domain/pick-photos';
import { PHOTO_TYPES, Upload, UploadLink } from '../domain/upload';
import { UploadUseCase } from '../domain/upload.usecase';

/** A chosen photo on its way up. Once it is through it leaves the queue and joins the photos. */
export interface QueuedPhoto {
  id: number;
  file: File;
  /** Local address of the chosen file, for a preview before it is uploaded. */
  preview: string;
  state: 'waiting' | 'uploading' | 'failed';
  failure?: Failure;
}

/**
 * The upload page of `/photos/:token` or `/stand/:token`: the visitor's photos, how many are
 * left, and the queue of chosen photos that go up one after the other. Provided on that route.
 */
@Service({ autoProvided: false })
export class UploadStore {
  private readonly _useCase = inject(UploadUseCase);
  private readonly _isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly _link = signal<UploadLink | undefined>(undefined);

  /**
   * At the stand the browser first gets its device cookie, so it sees its own photos and may
   * upload. The server only reads the page, it has no cookie of the visitor.
   */
  private readonly _upload = rxResource({
    params: () => this._link(),
    stream: ({ params: link }) =>
      link.kind === 'stand' && this._isBrowser
        ? this._useCase.registerDevice(link.token).pipe(switchMap(() => this._useCase.get(link)))
        : this._useCase.get(link),
  });

  private readonly _queue = signal<QueuedPhoto[]>([]);
  private _nextId = 0;
  private _running = false;
  /**
   * Of the photos chosen since the queue was last empty: how many and how many are through. It
   * stays after the last one, so "3 of 3" can be told, and starts over with the next choice.
   */
  private readonly _batch = signal({ total: 0, done: 0 });

  private readonly _uploadMutation = mutation();
  private readonly _deleteMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guard.
  readonly upload = computed(() => (this._upload.hasValue() ? this._upload.value() : undefined));
  readonly uploadState = asyncState(this._upload);
  readonly queue = this._queue.asReadonly();
  readonly batch = this._batch.asReadonly();
  readonly failedCount = computed(
    () => this._queue().filter((item) => item.state === 'failed').length,
  );
  /** State of the most recent deletion of an own photo. */
  readonly deleteState = this._deleteMutation.state;

  /** Photos that may still be chosen: what the backend allows minus what is queued. */
  readonly free = computed(() => {
    const left = this.upload()?.left ?? 0;
    const pending = this._queue().filter((item) => item.state !== 'failed').length;
    return Math.max(0, left - pending);
  });

  constructor() {
    // Local previews hold the file in memory until they are released.
    inject(DestroyRef).onDestroy(() =>
      this._queue().forEach((item) => URL.revokeObjectURL(item.preview)),
    );
  }

  select(link: UploadLink): void {
    this._link.set(link);
    this._deleteMutation.reset();
  }

  reload(): void {
    this._upload.reload();
  }

  photoUrl(photoId: string): string | undefined {
    const link = this._link();
    return link ? this._useCase.photoUrl(link, photoId) : undefined;
  }

  /**
   * Queues the chosen files and starts uploading them one after the other. Returns what was
   * left out and why. `name` is who takes the photos, asked for at the stand only.
   */
  add(files: readonly File[], name: string): PickedPhotos {
    const picked = pickPhotos(files, this.free(), PHOTO_TYPES);
    if (picked.accepted.length > 0) {
      // A new choice starts a new count. The last one stays until then, so its end is told.
      if (this._queue().length === 0) {
        this._batch.set({ total: 0, done: 0 });
      }
      const items = picked.accepted.map((file): QueuedPhoto => ({
        id: this._nextId++,
        file,
        preview: URL.createObjectURL(file),
        state: 'waiting',
      }));
      this._queue.update((queue) => [...queue, ...items]);
      this._batch.update((batch) => ({ ...batch, total: batch.total + items.length }));
      void this._process(name);
    }
    return picked;
  }

  /** Tries a failed photo again. */
  retry(id: number, name: string): void {
    this._setState(id, 'waiting');
    void this._process(name);
  }

  /** Drops a failed photo from the queue. */
  discard(id: number): void {
    const item = this._queue().find((queued) => queued.id === id);
    if (item) {
      URL.revokeObjectURL(item.preview);
      this._queue.update((queue) => queue.filter((queued) => queued.id !== id));
      this._batch.update((batch) => ({ ...batch, total: Math.max(0, batch.total - 1) }));
    }
  }

  /** Takes back an own photo. Possible outside the upload window too. */
  async deletePhoto(photoId: string): Promise<boolean> {
    const link = this._link();
    const upload = link
      ? await this._deleteMutation.run(this._useCase.deletePhoto(link, photoId))
      : undefined;
    if (upload) {
      this._setUpload(upload);
    }
    return upload !== undefined;
  }

  /** Uploads the waiting photos one at a time, so a slow phone connection is not split up. */
  private async _process(name: string): Promise<void> {
    const link = this._link();
    if (this._running || !link) {
      return;
    }
    this._running = true;
    let next = this._queue().find((item) => item.state === 'waiting');
    while (next) {
      const item = next;
      this._setState(item.id, 'uploading');
      const upload = await this._uploadMutation.run(this._useCase.upload(link, item.file, name));
      if (upload) {
        URL.revokeObjectURL(item.preview);
        this._queue.update((queue) => queue.filter((queued) => queued.id !== item.id));
        this._batch.update((batch) => ({ ...batch, done: batch.done + 1 }));
        this._setUpload(upload);
      } else {
        this._setState(item.id, 'failed', this._uploadMutation.state().failure);
      }
      next = this._queue().find((queued) => queued.state === 'waiting');
    }
    this._running = false;
  }

  private _setState(id: number, state: QueuedPhoto['state'], failure?: Failure): void {
    this._queue.update((queue) =>
      queue.map((item) => (item.id === id ? { ...item, state, failure } : item)),
    );
  }

  /** Every answer of the backend holds the photos and the number left, it replaces the old. */
  private _setUpload(upload: Upload): void {
    patchResource(this._upload, () => upload);
  }
}
