import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { GuestDto } from './guest.dto';
import { GuestsRepository } from './guests.repository';

const GUESTS = 'https://api.example.com/events/e%2F1/guests';
const DTO: GuestDto = {
  id: 'g/1',
  name: 'Ada',
  note: null,
  maxCompanions: 1,
  token: 'rsvp',
  photoToken: 'photo',
  response: 'pending',
  companions: 0,
  companionsReduced: false,
  message: null,
  answeredBy: null,
  respondedAt: null,
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-11T09:00:00.000Z',
};

describe('GuestsRepository', () => {
  let repository: GuestsRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(GuestsRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the guests of an event and maps them', async () => {
    const guests = firstValueFrom(repository.getAll('e/1'));
    const request = backend.expectOne(GUESTS);
    request.flush({ guests: [DTO] });

    expect(request.request.method).toBe('GET');
    expect((await guests)[0].createdAt).toEqual(new Date(DTO.createdAt));
  });

  it('adds a guest with POST', async () => {
    const guest = firstValueFrom(
      repository.create('e/1', { name: ' Ada ', note: '', maxCompanions: 1 }),
    );
    const request = backend.expectOne(GUESTS);
    request.flush({ guest: DTO }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Ada', note: null, maxCompanions: 1 });
    expect((await guest).id).toBe('g/1');
  });

  it('adds a list of guests at once', async () => {
    const guests = firstValueFrom(
      repository.createBulk('e/1', { names: ['Ada', ' ', 'Linus'], maxCompanions: 0 }),
    );
    const request = backend.expectOne(`${GUESTS}/bulk`);
    request.flush({ guests: [DTO, { ...DTO, id: 'g2' }] }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ names: ['Ada', 'Linus'], maxCompanions: 0 });
    expect(await guests).toHaveLength(2);
  });

  it('updates a guest with PATCH and encodes its id', async () => {
    const guest = firstValueFrom(
      repository.update('e/1', 'g/1', { name: 'Ada', note: ' Vegan ', maxCompanions: 2 }),
    );
    const request = backend.expectOne(`${GUESTS}/g%2F1`);
    request.flush({ guest: DTO });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Ada', note: 'Vegan', maxCompanions: 2 });
    await guest;
  });

  it('records an answer for a guest with PUT', async () => {
    const guest = firstValueFrom(
      repository.setResponse('e/1', 'g/1', { response: 'accepted', companions: 1 }),
    );
    const request = backend.expectOne(`${GUESTS}/g%2F1/response`);
    request.flush({ guest: { ...DTO, response: 'accepted', companions: 1, answeredBy: 'host' } });

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ response: 'accepted', companions: 1 });
    expect((await guest).answeredBy).toBe('host');
  });

  it('deletes a guest with DELETE', async () => {
    const done = firstValueFrom(repository.delete('e/1', 'g/1'), { defaultValue: undefined });
    const request = backend.expectOne(`${GUESTS}/g%2F1`);
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('renews the personal link and the upload link of a guest', async () => {
    const renewed = firstValueFrom(repository.renewToken('e/1', 'g/1'));
    const token = backend.expectOne(`${GUESTS}/g%2F1/token`);
    expect(token.request.method).toBe('POST');
    token.flush({ guest: { ...DTO, token: 'new' } });
    expect((await renewed).token).toBe('new');

    const renewedPhoto = firstValueFrom(repository.renewPhotoToken('e/1', 'g/1'));
    const photoToken = backend.expectOne(`${GUESTS}/g%2F1/photo-token`);
    expect(photoToken.request.method).toBe('POST');
    photoToken.flush({ guest: { ...DTO, photoToken: 'new' } });
    expect((await renewedPhoto).photoToken).toBe('new');
  });

  it('builds the address of the CSV export in the requested language', () => {
    expect(repository.exportUrl('e/1', 'en')).toBe(`${GUESTS}/export?lang=en`);
  });
});
