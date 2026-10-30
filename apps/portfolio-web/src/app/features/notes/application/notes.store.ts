import { computed, inject, Service, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { asyncState } from '@core/state/async-state';
import { mutation } from '@core/state/mutation';
import { patchResource } from '@core/state/patch-resource';
import { map } from 'rxjs';
import { Note, NoteDraft, NoteImage } from '../domain/note';
import { NotesUseCase } from '../domain/notes.usecase';

/** Feature state for notes. Provided in the feature routes, so it lives as long as the feature. */
@Service({ autoProvided: false })
export class NotesStore {
  private readonly _useCase = inject(NotesUseCase);

  private readonly _list = rxResource({
    stream: () => this._useCase.getAll(),
    defaultValue: [] as Note[],
  });

  private readonly _selectedId = signal<string | undefined>(undefined);
  private readonly _detail = rxResource({
    params: () => this._selectedId(),
    stream: ({ params: id }) => this._useCase.getById(id),
  });

  private readonly _mutation = mutation();
  // Images are written after the note itself. With a state of their own, a failed upload does
  // not hide that the note was saved.
  private readonly _imageMutation = mutation();

  // Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
  readonly notes = computed(() => (this._list.hasValue() ? this._list.value() : []));
  readonly isEmpty = computed(() => this.notes().length === 0);
  readonly listState = asyncState(this._list);

  readonly selected = computed(() => (this._detail.hasValue() ? this._detail.value() : undefined));
  readonly detailState = asyncState(this._detail);

  /** State of the most recent create, update or delete. */
  readonly mutationState = this._mutation.state;
  /** State of the most recent upload or deletion of images. */
  readonly imageMutationState = this._imageMutation.state;

  /** Loads a single note for editing. Pass `undefined` to clear the selection. */
  select(id: string | undefined): void {
    this._selectedId.set(id);
    this._mutation.reset();
    this._imageMutation.reset();
  }

  reload(): void {
    this._list.reload();
  }

  async create(draft: NoteDraft): Promise<Note | undefined> {
    const note = await this._mutation.run(this._useCase.create(draft));
    if (note) {
      patchResource(this._list, (notes) => [note, ...notes]);
    }
    return note;
  }

  async update(id: string, draft: NoteDraft): Promise<Note | undefined> {
    const note = await this._mutation.run(this._useCase.update(id, draft));
    if (note) {
      patchResource(this._list, (notes) => [
        note,
        ...notes.filter((existing) => existing.id !== id),
      ]);
      if (this._selectedId() === id) {
        this._detail.set(note);
      }
    }
    return note;
  }

  async remove(id: string): Promise<boolean> {
    const removed = await this._mutation.run(this._useCase.delete(id).pipe(map(() => true)));
    if (removed) {
      patchResource(this._list, (notes) => notes.filter((note) => note.id !== id));
      if (this._selectedId() === id) {
        this._selectedId.set(undefined);
      }
    }
    return removed ?? false;
  }

  /** Adds images to a note. The backend stores all of them or none. */
  async uploadImages(id: string, files: File[]): Promise<NoteImage[] | undefined> {
    const images = await this._imageMutation.run(this._useCase.uploadImages(id, files));
    if (images) {
      this._patchImages(id, (existing) => [...existing, ...images]);
    }
    return images;
  }

  async removeImage(id: string, imageId: string): Promise<boolean> {
    const removed = await this._imageMutation.run(
      this._useCase.deleteImage(id, imageId).pipe(map(() => true)),
    );
    if (removed) {
      this._patchImages(id, (existing) => existing.filter((image) => image.id !== imageId));
    }
    return removed ?? false;
  }

  private _patchImages(id: string, change: (images: NoteImage[]) => NoteImage[]): void {
    const patch = (note: Note): Note =>
      note.id === id ? { ...note, images: change(note.images) } : note;
    patchResource(this._list, (notes) => notes.map(patch));
    if (this._selectedId() === id) {
      patchResource(this._detail, (note) => note && patch(note));
    }
  }
}
