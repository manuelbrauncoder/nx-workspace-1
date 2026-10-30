import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { ContactRepository } from './contact.repository';

describe('ContactRepository', () => {
  let repository: ContactRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(ContactRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('posts the trimmed message to the contact endpoint', async () => {
    const sent = firstValueFrom(
      repository.send({ name: ' Ada ', email: 'ada@example.com ', message: ' Hallo! ' }),
    );
    const request = backend.expectOne('https://api.example.com/contact');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hallo!',
    });
    await expect(sent).resolves.toBeUndefined();
  });

  describe('received messages', () => {
    const DTO = {
      id: 'a/b',
      name: 'Ada',
      email: 'ada@example.com',
      message: 'Hallo!\nWie geht es?',
      read: false,
      createdAt: '2026-10-20T08:15:00.000Z',
    };

    it('loads the messages and maps them', async () => {
      const messages = firstValueFrom(repository.getMessages());
      const request = backend.expectOne('https://api.example.com/contact/messages');
      request.flush({ messages: [DTO] });

      expect(request.request.method).toBe('GET');
      expect((await messages)[0]).toEqual({ ...DTO, createdAt: new Date(DTO.createdAt) });
    });

    it('marks a message as read with PATCH and encodes the id', async () => {
      const message = firstValueFrom(repository.setRead('a/b', true));
      const request = backend.expectOne('https://api.example.com/contact/messages/a%2Fb');
      request.flush({ message: { ...DTO, read: true } });

      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ read: true });
      expect((await message).read).toBe(true);
    });

    it('deletes a message with DELETE', async () => {
      const done = firstValueFrom(repository.deleteMessage('1'), { defaultValue: undefined });
      const request = backend.expectOne('https://api.example.com/contact/messages/1');
      request.flush(null, { status: 204, statusText: 'No Content' });

      expect(request.request.method).toBe('DELETE');
      await done;
    });
  });
});
