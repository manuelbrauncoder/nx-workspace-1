import { inject, Service } from '@angular/core';
import { NotesRepository } from '@api/notes/notes.repository';
import { Observable } from 'rxjs';
import { Note, NoteDraft, NoteImage } from './note';

/**
 * What the notes feature can do with its data. For now it only passes the repository through.
 * It is the place to combine several API layers once the feature needs more than one.
 */
@Service({ autoProvided: false })
export class NotesUseCase {
  private readonly _repository = inject(NotesRepository);

  getAll(): Observable<Note[]> {
    return this._repository.getAll();
  }

  getById(id: string): Observable<Note> {
    return this._repository.getById(id);
  }

  create(draft: NoteDraft): Observable<Note> {
    return this._repository.create(draft);
  }

  update(id: string, draft: NoteDraft): Observable<Note> {
    return this._repository.update(id, draft);
  }

  delete(id: string): Observable<void> {
    return this._repository.delete(id);
  }

  uploadImages(id: string, files: File[]): Observable<NoteImage[]> {
    return this._repository.uploadImages(id, files);
  }

  deleteImage(id: string, imageId: string): Observable<void> {
    return this._repository.deleteImage(id, imageId);
  }
}
