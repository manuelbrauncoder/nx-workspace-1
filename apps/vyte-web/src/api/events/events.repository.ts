import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { EventDraft, EventImage, VyteEvent } from './event';
import { EventDtoMapper } from './event-dto.mapper';
import { EventImagesResponseDto, EventResponseDto, EventsResponseDto } from './event.dto';

/**
 * Talks to the event endpoints and hands out models, never DTOs. Everything needs a session.
 * An event the user is no member of is a 404, a change their role does not allow a 403, a change
 * to a past event a 409.
 */
@Service()
export class EventsRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(EventDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/events`;
  }

  /** The events of the signed-in user: upcoming ones soonest first, then past ones. */
  getAll(): Observable<VyteEvent[]> {
    return this._http
      .get<EventsResponseDto>(this._url)
      .pipe(map((response) => this._mapper.toModels(response.events)));
  }

  getById(id: string): Observable<VyteEvent> {
    return this._http
      .get<EventResponseDto>(this._urlFor(id))
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  /** Creates the event without images, those follow through `uploadImages`. */
  create(draft: EventDraft): Observable<VyteEvent> {
    return this._http
      .post<EventResponseDto>(this._url, this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  update(id: string, draft: EventDraft): Observable<VyteEvent> {
    return this._http
      .patch<EventResponseDto>(this._urlFor(id), this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  /** Owner only. Removes the guests, the photos and the team with it. */
  delete(id: string): Observable<void> {
    return this._http.delete<void>(this._urlFor(id));
  }

  /**
   * Appends images. All or nothing: if the backend rejects one file or the limit would be
   * passed, it stores none. Resolves with every image of the event.
   */
  uploadImages(id: string, files: File[]): Observable<EventImage[]> {
    const body = new FormData();
    for (const file of files) {
      body.append('images', file, file.name);
    }
    return this._http
      .post<EventImagesResponseDto>(`${this._urlFor(id)}/images`, body)
      .pipe(map((response) => this._mapper.toImageModels(id, response.images)));
  }

  /** `images` are all images of the event in their new order. */
  reorderImages(id: string, images: EventImage[]): Observable<EventImage[]> {
    return this._http
      .put<EventImagesResponseDto>(
        `${this._urlFor(id)}/images/order`,
        this._mapper.toOrderDto(images),
      )
      .pipe(map((response) => this._mapper.toImageModels(id, response.images)));
  }

  /** Resolves with the images that are left. */
  deleteImage(id: string, imageId: string): Observable<EventImage[]> {
    return this._http
      .delete<EventImagesResponseDto>(`${this._urlFor(id)}/images/${encodeURIComponent(imageId)}`)
      .pipe(map((response) => this._mapper.toImageModels(id, response.images)));
  }

  /** Turns the save-the-date page on or changes its note. The link stays the same. */
  setSaveTheDate(id: string, note: string): Observable<VyteEvent> {
    return this._http
      .put<EventResponseDto>(this._saveTheDateUrl(id), this._mapper.toSaveTheDateDto(note))
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  /** Turns the save-the-date page off, its link stops working. Also possible after the event. */
  removeSaveTheDate(id: string): Observable<VyteEvent> {
    return this._http
      .delete<EventResponseDto>(this._saveTheDateUrl(id))
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  /** Gives the save-the-date page a new link, the old one stops working. */
  renewSaveTheDateToken(id: string): Observable<VyteEvent> {
    return this._http
      .post<EventResponseDto>(`${this._saveTheDateUrl(id)}/token`, null)
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  enablePhotoStand(id: string): Observable<VyteEvent> {
    return this._http
      .put<EventResponseDto>(this._photoStandUrl(id), null)
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  /** Turns the photo stand off, its link stops working. Also possible after the event. */
  disablePhotoStand(id: string): Observable<VyteEvent> {
    return this._http
      .delete<EventResponseDto>(this._photoStandUrl(id))
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  /** Gives the photo stand a new link, the printed QR code stops working. */
  renewPhotoStandToken(id: string): Observable<VyteEvent> {
    return this._http
      .post<EventResponseDto>(`${this._photoStandUrl(id)}/token`, null)
      .pipe(map((response) => this._mapper.toModel(response.event)));
  }

  private _urlFor(id: string): string {
    return `${this._url}/${encodeURIComponent(id)}`;
  }

  private _saveTheDateUrl(id: string): string {
    return `${this._urlFor(id)}/save-the-date`;
  }

  private _photoStandUrl(id: string): string {
    return `${this._urlFor(id)}/photo-stand`;
  }
}
