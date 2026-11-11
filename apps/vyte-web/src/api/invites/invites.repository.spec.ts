import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { EventDto } from '../events/event.dto';
import { InvitesRepository } from './invites.repository';

const INVITE = 'https://api.example.com/invites/t%2F1';
const EVENT_DTO: EventDto = {
  id: 'e1',
  title: 'Sommerfest',
  description: '',
  locationName: null,
  address: null,
  allDay: false,
  startsAt: '2027-06-12T16:00:00.000Z',
  endsAt: null,
  timeZone: 'Europe/Berlin',
  rsvpDeadline: null,
  role: 'editor',
  past: false,
  images: [],
  counts: { invited: 0, coming: 0, declined: 0, pending: 0, atMost: 0 },
  saveTheDate: null,
  photoStand: null,
  createdAt: '2026-11-11T09:00:00.000Z',
  updatedAt: '2026-11-11T10:00:00.000Z',
};

describe('InvitesRepository', () => {
  let repository: InvitesRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(InvitesRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads what the page of an invite shows and encodes the token', async () => {
    const preview = firstValueFrom(repository.getByToken('t/1'));
    const request = backend.expectOne(INVITE);
    request.flush({
      invite: {
        eventTitle: 'Sommerfest',
        startsAt: '2027-06-12T16:00:00.000Z',
        allDay: false,
        timeZone: 'Europe/Berlin',
        ownerName: 'Ada',
      },
    });

    expect(request.request.method).toBe('GET');
    expect(await preview).toMatchObject({
      eventTitle: 'Sommerfest',
      startsAt: new Date('2027-06-12T16:00:00.000Z'),
      ownerName: 'Ada',
    });
  });

  it('accepts an invite for the signed-in user and answers with the event', async () => {
    const event = firstValueFrom(repository.accept('t/1'));
    const request = backend.expectOne(`${INVITE}/accept`);
    request.flush({ event: EVENT_DTO });

    expect(request.request.method).toBe('POST');
    expect((await event).role).toBe('editor');
  });

  it('creates an account through an invite and answers with the event', async () => {
    const event = firstValueFrom(
      repository.signUp('t/1', { name: '', email: ' ada@example.com ', password: 'geheim12' }),
    );
    const request = backend.expectOne(`${INVITE}/sign-up`);
    request.flush({ event: EVENT_DTO }, { status: 201, statusText: 'Created' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ada@example.com', password: 'geheim12' });
    expect((await event).id).toBe('e1');
  });
});
