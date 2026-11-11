import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { PhotoDto } from './photo.dto';
import { PhotosRepository } from './photos.repository';

const PHOTOS = 'https://api.example.com/events/e%2F1/photos';
const DTO: PhotoDto = {
  id: 'p/1',
  source: 'guest',
  uploaderName: 'Grace',
  width: 2560,
  height: 1440,
  hidden: false,
  createdAt: '2027-06-12T18:00:00.000Z',
};

describe('PhotosRepository', () => {
  let repository: PhotosRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(PhotosRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the photos of an event and maps them', async () => {
    const photos = firstValueFrom(repository.getAll('e/1'));
    const request = backend.expectOne(PHOTOS);
    request.flush({ photos: [DTO] });

    expect(request.request.method).toBe('GET');
    expect((await photos)[0].createdAt).toEqual(new Date(DTO.createdAt));
  });

  it('hides a photo with PATCH and encodes its id', async () => {
    const photo = firstValueFrom(repository.setHidden('e/1', 'p/1', true));
    const request = backend.expectOne(`${PHOTOS}/p%2F1`);
    request.flush({ photo: { ...DTO, hidden: true } });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ hidden: true });
    expect((await photo).hidden).toBe(true);
  });

  it('deletes a photo with DELETE', async () => {
    const done = firstValueFrom(repository.delete('e/1', 'p/1'), { defaultValue: undefined });
    const request = backend.expectOne(`${PHOTOS}/p%2F1`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('builds the addresses of a photo and of the ZIP download', () => {
    expect(repository.photoUrl('e/1', 'p/1')).toBe(`${PHOTOS}/p%2F1`);
    expect(repository.archiveUrl('e/1')).toBe(`${PHOTOS}/archive`);
  });
});
