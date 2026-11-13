import { inject, Service } from '@angular/core';
import { UploadsRepository } from '@api/upload/uploads.repository';
import { Observable } from 'rxjs';
import { Upload, UploadLink } from './upload';

/**
 * What the upload pages can do. For now it only passes the repository through. It is the place
 * to combine several API layers once the feature needs more than one.
 */
@Service({ autoProvided: false })
export class UploadUseCase {
  private readonly _repository = inject(UploadsRepository);

  get(link: UploadLink): Observable<Upload> {
    return this._repository.get(link);
  }

  /** Gives this browser its device cookie for the photo stand. Once, before the first upload. */
  registerDevice(token: string): Observable<void> {
    return this._repository.registerDevice(token);
  }

  /** One photo per request. Resolves with the photos and the number left after it. */
  upload(link: UploadLink, file: File, name: string): Observable<Upload> {
    return this._repository.upload(link, file, name);
  }

  deletePhoto(link: UploadLink, photoId: string): Observable<Upload> {
    return this._repository.deletePhoto(link, photoId);
  }

  photoUrl(link: UploadLink, photoId: string): string {
    return this._repository.photoUrl(link, photoId);
  }
}
