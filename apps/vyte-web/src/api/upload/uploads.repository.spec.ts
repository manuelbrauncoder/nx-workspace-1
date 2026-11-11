import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { UploadLink } from './upload';
import { UploadDto } from './upload.dto';
import { UploadsRepository } from './uploads.repository';

const API = 'https://api.example.com';
const GUEST: UploadLink = { kind: 'guest', token: 't/1' };
const STAND: UploadLink = { kind: 'stand', token: 's/1' };
const DTO: UploadDto = {
  eventTitle: 'Sommerfest',
  guestName: null,
  photos: [{ id: 'p1', width: 2560, height: 1440, createdAt: '2027-06-12T18:00:00.000Z' }],
  limit: 6,
  left: 5,
  open: true,
  opensAt: '2027-06-12T16:00:00.000Z',
  closesAt: '2027-06-19T22:00:00.000Z',
};
const photo = () => new File(['a'], 'a.jpg', { type: 'image/jpeg' });

describe('UploadsRepository', () => {
  let repository: UploadsRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: API } },
      ],
    });
    repository = TestBed.inject(UploadsRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the upload page of a guest and maps it', async () => {
    const upload = firstValueFrom(repository.get(GUEST));
    const request = backend.expectOne(`${API}/photos/t%2F1`);
    request.flush({ upload: DTO });

    expect(request.request.method).toBe('GET');
    expect((await upload).closesAt).toEqual(new Date(DTO.closesAt));
  });

  it('loads the upload page of the photo stand from its own address', async () => {
    const upload = firstValueFrom(repository.get(STAND));
    backend.expectOne(`${API}/stand/s%2F1`).flush({ upload: DTO });

    expect((await upload).left).toBe(5);
  });

  it('registers the device at the photo stand', async () => {
    const done = firstValueFrom(repository.registerDevice('s/1'), { defaultValue: undefined });
    const request = backend.expectOne(`${API}/stand/s%2F1/device`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('POST');
    await done;
  });

  it('uploads one photo of a guest in the field `photo`, without a name', async () => {
    const upload = firstValueFrom(repository.upload(GUEST, photo(), 'Grace'));
    const request = backend.expectOne(`${API}/photos/t%2F1`);
    request.flush({ upload: DTO }, { status: 201, statusText: 'Created' });

    const body = request.request.body as FormData;
    expect(request.request.method).toBe('POST');
    expect(body.get('photo')).toBeInstanceOf(File);
    expect(body.has('name')).toBe(false);
    expect((await upload).photos).toHaveLength(1);
  });

  it('sends the trimmed name with a photo of the stand and leaves an empty one out', async () => {
    const named = firstValueFrom(repository.upload(STAND, photo(), ' Grace '));
    const withName = backend.expectOne(`${API}/stand/s%2F1`);
    expect((withName.request.body as FormData).get('name')).toBe('Grace');
    withName.flush({ upload: DTO }, { status: 201, statusText: 'Created' });
    await named;

    const anonymous = firstValueFrom(repository.upload(STAND, photo(), '  '));
    const withoutName = backend.expectOne(`${API}/stand/s%2F1`);
    expect((withoutName.request.body as FormData).has('name')).toBe(false);
    withoutName.flush({ upload: DTO }, { status: 201, statusText: 'Created' });
    await anonymous;
  });

  it('takes a photo back and answers with what is left', async () => {
    const upload = firstValueFrom(repository.deletePhoto(GUEST, 'p/1'));
    const request = backend.expectOne(`${API}/photos/t%2F1/p%2F1`);
    request.flush({ upload: { ...DTO, photos: [], left: 6 } });

    expect(request.request.method).toBe('DELETE');
    expect(await upload).toMatchObject({ photos: [], left: 6 });
  });

  it('builds the address of a photo for both kinds of page', () => {
    expect(repository.photoUrl(GUEST, 'p/1')).toBe(`${API}/photos/t%2F1/p%2F1`);
    expect(repository.photoUrl(STAND, 'p/1')).toBe(`${API}/stand/s%2F1/p%2F1`);
  });
});
