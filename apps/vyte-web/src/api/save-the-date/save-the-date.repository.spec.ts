import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { SaveTheDateRepository } from './save-the-date.repository';

const PAGE = 'https://api.example.com/save-the-date/t%2F1';

describe('SaveTheDateRepository', () => {
  let repository: SaveTheDateRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(SaveTheDateRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the page of a token and maps it', async () => {
    const saveTheDate = firstValueFrom(repository.getByToken('t/1'));
    const request = backend.expectOne(PAGE);
    request.flush({
      saveTheDate: {
        past: false,
        title: 'Sommerfest',
        allDay: false,
        startsAt: '2027-06-12T16:00:00.000Z',
        endsAt: null,
        timeZone: 'Europe/Berlin',
        locationName: null,
        note: null,
        cover: null,
      },
    });

    expect(request.request.method).toBe('GET');
    expect(await saveTheDate).toMatchObject({
      past: false,
      startsAt: new Date('2027-06-12T16:00:00.000Z'),
    });
  });

  it('builds the addresses of the cover and of the calendar file', () => {
    expect(repository.coverUrl('t/1')).toBe(`${PAGE}/cover`);
    expect(repository.calendarUrl('t/1')).toBe(`${PAGE}/calendar`);
  });

  it('builds the preview image with the fixed size', () => {
    expect(repository.previewImage('t/1')).toEqual({
      url: `${PAGE}/preview`,
      width: 1200,
      height: 630,
    });
  });
});
