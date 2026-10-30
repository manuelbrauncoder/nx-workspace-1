import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { MediaDto } from './media.dto';
import { MediaRepository } from './media.repository';

const DTO: MediaDto = {
  id: 'm1',
  url: 'https://api.example.com/media/m1',
  width: 2000,
  height: 1090,
  createdAt: '2026-10-01T09:00:00.000Z',
};

describe('MediaRepository', () => {
  let repository: MediaRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(MediaRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads all images and maps them', async () => {
    const media = firstValueFrom(repository.getAll());
    const request = backend.expectOne('https://api.example.com/media');
    request.flush({ media: [DTO] });

    expect(request.request.method).toBe('GET');
    expect((await media)[0].createdAt).toEqual(new Date(DTO.createdAt));
  });

  it('uploads one file in the field `file`', async () => {
    const file = new File(['a'], 'portrait.png', { type: 'image/png' });
    const media = firstValueFrom(repository.upload(file));
    const request = backend.expectOne('https://api.example.com/media');
    request.flush({ media: DTO }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).get('file')).toBeInstanceOf(File);
    expect((await media).id).toBe('m1');
  });
});
