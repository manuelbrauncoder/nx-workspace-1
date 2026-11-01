import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { NoteDto } from './note.dto';
import { NotesRepository } from './notes.repository';

const DTO: NoteDto = {
  id: 'a/b',
  title: 'Titel',
  description: 'Inhalt',
  createdAt: '2026-01-12T09:00:00.000Z',
  updatedAt: '2026-01-13T14:30:00.000Z',
  images: [],
};
const IMAGE_DTO = { id: 'i1', width: 800, height: 600, createdAt: '2026-01-12T09:05:00.000Z' };

describe('NotesRepository', () => {
  let repository: NotesRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(NotesRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads all notes from the configured base URL and maps them', async () => {
    const notes = firstValueFrom(repository.getAll());
    const request = backend.expectOne('https://api.example.com/notes');
    request.flush({ notes: [DTO] });

    expect(request.request.method).toBe('GET');
    expect((await notes)[0].updatedAt).toEqual(new Date(DTO.updatedAt));
  });

  it('loads a single note and encodes its id', async () => {
    const note = firstValueFrom(repository.getById('a/b'));
    backend.expectOne('https://api.example.com/notes/a%2Fb').flush({ note: DTO });

    expect((await note).title).toBe('Titel');
  });

  it('creates a note with POST', async () => {
    const note = firstValueFrom(repository.create({ title: ' Titel ', description: 'Inhalt' }));
    const request = backend.expectOne('https://api.example.com/notes');
    request.flush({ note: DTO });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ title: 'Titel', description: 'Inhalt' });
    expect((await note).id).toBe('a/b');
  });

  it('updates a note with PATCH', async () => {
    const note = firstValueFrom(repository.update('1', { title: 'Titel', description: 'Neu' }));
    const request = backend.expectOne('https://api.example.com/notes/1');
    request.flush({ note: DTO });

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ title: 'Titel', description: 'Neu' });
    await note;
  });

  it('deletes a note with DELETE', async () => {
    const done = firstValueFrom(repository.delete('1'), { defaultValue: undefined });
    const request = backend.expectOne('https://api.example.com/notes/1');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });

  it('uploads images as multipart form data and maps the new records', async () => {
    const files = [new File(['a'], 'a.png'), new File(['b'], 'b.png')];
    const images = firstValueFrom(repository.uploadImages('1', files));
    const request = backend.expectOne('https://api.example.com/notes/1/images');
    request.flush({ images: [IMAGE_DTO] });

    expect(request.request.method).toBe('POST');
    expect((request.request.body as FormData).getAll('images')).toHaveLength(2);
    expect(await images).toEqual([
      {
        id: 'i1',
        url: 'https://api.example.com/notes/1/images/i1',
        width: 800,
        height: 600,
        createdAt: new Date(IMAGE_DTO.createdAt),
      },
    ]);
  });

  it('deletes an image with DELETE', async () => {
    const done = firstValueFrom(repository.deleteImage('1', 'i1'), { defaultValue: undefined });
    const request = backend.expectOne('https://api.example.com/notes/1/images/i1');
    request.flush(null, { status: 204, statusText: 'No Content' });

    expect(request.request.method).toBe('DELETE');
    await done;
  });
});
