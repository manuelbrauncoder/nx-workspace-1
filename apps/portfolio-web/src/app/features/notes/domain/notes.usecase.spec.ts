import { TestBed } from '@angular/core/testing';
import { NotesRepository } from '@api/notes/notes.repository';
import { firstValueFrom, of } from 'rxjs';
import { Note } from './note';
import { NotesUseCase } from './notes.usecase';

const NOTE: Note = {
  id: '1',
  title: 'Titel',
  description: 'Inhalt',
  createdAt: new Date('2026-01-12T09:00:00.000Z'),
  updatedAt: new Date('2026-01-12T09:00:00.000Z'),
  images: [],
};
const DRAFT = { title: 'Titel', description: 'Inhalt' };

describe('NotesUseCase', () => {
  const repository = {
    getAll: vi.fn(() => of([NOTE])),
    getById: vi.fn(() => of(NOTE)),
    create: vi.fn(() => of(NOTE)),
    update: vi.fn(() => of(NOTE)),
    delete: vi.fn(() => of(undefined)),
    uploadImages: vi.fn(() => of([])),
    deleteImage: vi.fn(() => of(undefined)),
  };
  let useCase: NotesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: NotesRepository, useValue: repository }, NotesUseCase],
    });
    useCase = TestBed.inject(NotesUseCase);
  });

  it('loads all notes from the repository', async () => {
    expect(await firstValueFrom(useCase.getAll())).toEqual([NOTE]);
  });

  it('loads a single note from the repository', async () => {
    expect(await firstValueFrom(useCase.getById('1'))).toBe(NOTE);
    expect(repository.getById).toHaveBeenCalledWith('1');
  });

  it('passes writes on to the repository', async () => {
    await firstValueFrom(useCase.create(DRAFT));
    await firstValueFrom(useCase.update('1', DRAFT));
    await firstValueFrom(useCase.delete('1'));

    expect(repository.create).toHaveBeenCalledWith(DRAFT);
    expect(repository.update).toHaveBeenCalledWith('1', DRAFT);
    expect(repository.delete).toHaveBeenCalledWith('1');
  });

  it('passes image writes on to the repository', async () => {
    const files = [new File(['a'], 'a.png')];
    await firstValueFrom(useCase.uploadImages('1', files));
    await firstValueFrom(useCase.deleteImage('1', 'i1'), { defaultValue: undefined });

    expect(repository.uploadImages).toHaveBeenCalledWith('1', files);
    expect(repository.deleteImage).toHaveBeenCalledWith('1', 'i1');
  });
});
