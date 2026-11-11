import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { EventDraft } from './event';
import { EventDto } from './event.dto';
import { EventsRepository } from './events.repository';

const API = 'https://api.example.com';
const DTO: EventDto = {
  id: 'e/1',
  title: 'Sommerfest',
  description: '',
  locationName: null,
  address: null,
  allDay: false,
  startsAt: '2027-06-12T16:00:00.000Z',
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: null,
  role: 'owner',
  past: false,
  images: [],
  counts: { invited: 0, coming: 0, declined: 0, pending: 0, atMost: 0 },
  saveTheDate: null,
  photoStand: null,
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-11T10:00:00.000Z',
};
const IMAGE_DTO = { id: 'i1', width: 1600, height: 900, position: 0 };
const IMAGE = { ...IMAGE_DTO, url: `${API}/events/e%2F1/images/i1` };
const DRAFT: EventDraft = {
  title: ' Sommerfest ',
  description: '',
  locationName: '',
  address: '',
  allDay: false,
  startsAt: new Date('2027-06-12T16:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: null,
};
const DRAFT_DTO = {
  title: 'Sommerfest',
  description: '',
  locationName: null,
  address: null,
  allDay: false,
  startsAt: '2027-06-12T16:00:00.000Z',
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: null,
};

describe('EventsRepository', () => {
  let repository: EventsRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: API } },
      ],
    });
    repository = TestBed.inject(EventsRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads all events from the configured base URL and maps them', async () => {
    const events = firstValueFrom(repository.getAll());
    const request = backend.expectOne(`${API}/events`);
    request.flush({ events: [DTO] });

    expect(request.request.method).toBe('GET');
    expect((await events)[0].startsAt).toEqual(new Date(DTO.startsAt));
  });

  it('loads a single event and encodes its id', async () => {
    const event = firstValueFrom(repository.getById('e/1'));
    backend.expectOne(`${API}/events/e%2F1`).flush({ event: DTO });

    expect((await event).title).toBe('Sommerfest');
  });

  it('creates an event with POST', async () => {
    const event = firstValueFrom(repository.create(DRAFT));
    const request = backend.expectOne(`${API}/events`);
    request.flush({ event: DTO }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(DRAFT_DTO);
    expect((await event).id).toBe('e/1');
  });

  it('updates an event with PATCH', async () => {
    const event = firstValueFrom(repository.update('e/1', DRAFT));
    const request = backend.expectOne(`${API}/events/e%2F1`);
    request.flush({ event: DTO });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(DRAFT_DTO);
    await event;
  });

  it('deletes an event with DELETE', async () => {
    const done = firstValueFrom(repository.delete('e/1'), { defaultValue: undefined });
    const request = backend.expectOne(`${API}/events/e%2F1`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('uploads images as multipart form data and maps every image of the event', async () => {
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
    const images = firstValueFrom(repository.uploadImages('e/1', files));
    const request = backend.expectOne(`${API}/events/e%2F1/images`);
    request.flush({ images: [IMAGE_DTO] }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).getAll('images')).toHaveLength(2);
    expect(await images).toEqual([IMAGE]);
  });

  it('sends the new order of the images with PUT', async () => {
    const images = firstValueFrom(repository.reorderImages('e/1', [{ ...IMAGE, id: 'i2' }, IMAGE]));
    const request = backend.expectOne(`${API}/events/e%2F1/images/order`);
    request.flush({ images: [IMAGE_DTO] });

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ ids: ['i2', 'i1'] });
    expect(await images).toEqual([IMAGE]);
  });

  it('deletes an image and answers with the ones that are left', async () => {
    const images = firstValueFrom(repository.deleteImage('e/1', 'i/2'));
    const request = backend.expectOne(`${API}/events/e%2F1/images/i%2F2`);
    request.flush({ images: [IMAGE_DTO] });

    expect(request.request.method).toBe('DELETE');
    expect(await images).toEqual([IMAGE]);
  });

  it('turns the save-the-date page on, off and renews its link', async () => {
    const withNote = { ...DTO, saveTheDate: { token: 'std', note: 'Bis bald' } };

    const set = firstValueFrom(repository.setSaveTheDate('e/1', ' Bis bald '));
    const put = backend.expectOne(`${API}/events/e%2F1/save-the-date`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ note: 'Bis bald' });
    put.flush({ event: withNote });
    expect((await set).saveTheDate).toEqual({ token: 'std', note: 'Bis bald' });

    const renewed = firstValueFrom(repository.renewSaveTheDateToken('e/1'));
    const post = backend.expectOne(`${API}/events/e%2F1/save-the-date/token`);
    expect(post.request.method).toBe('POST');
    post.flush({ event: withNote });
    await renewed;

    const removed = firstValueFrom(repository.removeSaveTheDate('e/1'));
    const del = backend.expectOne(`${API}/events/e%2F1/save-the-date`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ event: DTO });
    expect((await removed).saveTheDate).toBeNull();
  });

  it('turns the photo stand on, off and renews its link', async () => {
    const withStand = { ...DTO, photoStand: { token: 'stand' } };

    const enabled = firstValueFrom(repository.enablePhotoStand('e/1'));
    const put = backend.expectOne(`${API}/events/e%2F1/photo-stand`);
    expect(put.request.method).toBe('PUT');
    put.flush({ event: withStand });
    expect((await enabled).photoStand).toEqual({ token: 'stand' });

    const renewed = firstValueFrom(repository.renewPhotoStandToken('e/1'));
    const post = backend.expectOne(`${API}/events/e%2F1/photo-stand/token`);
    expect(post.request.method).toBe('POST');
    post.flush({ event: withStand });
    await renewed;

    const disabled = firstValueFrom(repository.disablePhotoStand('e/1'));
    const del = backend.expectOne(`${API}/events/e%2F1/photo-stand`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ event: DTO });
    expect((await disabled).photoStand).toBeNull();
  });
});
