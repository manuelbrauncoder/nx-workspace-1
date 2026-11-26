import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { InvitationDto } from './invitation.dto';
import { RsvpRepository } from './rsvp.repository';

const RSVP = 'https://api.example.com/rsvp/t%2F1';
const DTO: InvitationDto = {
  past: false,
  open: true,
  event: {
    title: 'Sommerfest',
    description: '',
    locationName: null,
    address: null,
    allDay: false,
    startsAt: '2027-06-12T16:00:00.000Z',
    endsAt: null,
    timeZone: 'Europe/Berlin',
    rsvpDeadline: null,
    images: [],
    hosts: ['Ada'],
  },
  guest: {
    name: 'Grace',
    maxCompanions: 2,
    response: 'pending',
    companions: 0,
    message: null,
    respondedAt: null,
  },
};

describe('RsvpRepository', () => {
  let repository: RsvpRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(RsvpRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the invitation of a token and maps it', async () => {
    const invitation = firstValueFrom(repository.getByToken('t/1'));
    const request = backend.expectOne(RSVP);
    request.flush({ invitation: DTO });

    expect(request.request.method).toBe('GET');
    expect(await invitation).toMatchObject({
      past: false,
      event: { startsAt: new Date('2027-06-12T16:00:00.000Z') },
    });
  });

  it('answers with what is left of a past event', async () => {
    const invitation = firstValueFrom(repository.getByToken('t/1'));
    backend.expectOne(RSVP).flush({ invitation: { past: true, event: { title: 'Sommerfest' } } });

    expect(await invitation).toEqual({ past: true, event: { title: 'Sommerfest' } });
  });

  it('saves the answer of a guest with PUT', async () => {
    const invitation = firstValueFrom(
      repository.answer('t/1', { response: 'accepted', companions: 1, message: '' }),
    );
    const request = backend.expectOne(RSVP);
    request.flush({ invitation: { ...DTO, guest: { ...DTO.guest, response: 'accepted' } } });

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ response: 'accepted', companions: 1, message: null });
    expect(await invitation).toMatchObject({ guest: { response: 'accepted' } });
  });

  it('builds the addresses of an image and of the calendar file', () => {
    expect(repository.imageUrl('t/1', 'i/1')).toBe(`${RSVP}/images/i%2F1`);
    expect(repository.calendarUrl('t/1')).toBe(`${RSVP}/calendar`);
  });

  it('builds the preview image with the fixed size', () => {
    expect(repository.previewImage('t/1')).toEqual({
      url: `${RSVP}/preview`,
      width: 1200,
      height: 630,
    });
  });
});
