import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Note, NoteDraft, NoteImage } from './note';
import { NoteDtoMapper } from './note-dto.mapper';
import { NoteImagesResponseDto, NoteResponseDto, NotesResponseDto } from './note.dto';

/** Talks to the notes endpoints and hands out models, never DTOs. */
@Service()
export class NotesRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(NoteDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/notes`;
  }

  /** The notes of the signed-in user, newest first. */
  getAll(): Observable<Note[]> {
    return this._http
      .get<NotesResponseDto>(this._url)
      .pipe(map((response) => this._mapper.toModels(response.notes)));
  }

  getById(id: string): Observable<Note> {
    return this._http
      .get<NoteResponseDto>(this._urlFor(id))
      .pipe(map((response) => this._mapper.toModel(response.note)));
  }

  /** Creates the note without images, those follow through `uploadImages`. */
  create(draft: NoteDraft): Observable<Note> {
    return this._http
      .post<NoteResponseDto>(this._url, this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.note)));
  }

  update(id: string, draft: NoteDraft): Observable<Note> {
    return this._http
      .patch<NoteResponseDto>(this._urlFor(id), this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.note)));
  }

  delete(id: string): Observable<void> {
    return this._http.delete<void>(this._urlFor(id));
  }

  /** All or nothing: if the backend rejects one file, it stores none. Resolves with the new images. */
  uploadImages(id: string, files: File[]): Observable<NoteImage[]> {
    const body = new FormData();
    for (const file of files) {
      body.append('images', file, file.name);
    }
    return this._http
      .post<NoteImagesResponseDto>(`${this._urlFor(id)}/images`, body)
      .pipe(map((response) => this._mapper.toImageModels(id, response.images)));
  }

  deleteImage(id: string, imageId: string): Observable<void> {
    return this._http.delete<void>(`${this._urlFor(id)}/images/${encodeURIComponent(imageId)}`);
  }

  private _urlFor(id: string): string {
    return `${this._url}/${encodeURIComponent(id)}`;
  }
}
