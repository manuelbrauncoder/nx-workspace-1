import { TestBed } from '@angular/core/testing';
import { EventsRepository } from '@api/events/events.repository';
import { firstValueFrom, of } from 'rxjs';
import { EventDraft, EventImage, VyteEvent } from './event';
import { EventsUseCase } from './events.usecase';

const EVENT = { id: 'e1', title: 'Sommerfest' } as VyteEvent;
const IMAGE = { id: 'i1' } as EventImage;
const DRAFT = { title: 'Sommerfest' } as EventDraft;

describe('EventsUseCase', () => {
  const repository = {
    getAll: vi.fn(() => of([EVENT])),
    getById: vi.fn(() => of(EVENT)),
    create: vi.fn(() => of(EVENT)),
    update: vi.fn(() => of(EVENT)),
    delete: vi.fn(() => of(undefined)),
    uploadImages: vi.fn(() => of([IMAGE])),
    reorderImages: vi.fn(() => of([IMAGE])),
    deleteImage: vi.fn(() => of([])),
    setSaveTheDate: vi.fn(() => of(EVENT)),
    removeSaveTheDate: vi.fn(() => of(EVENT)),
    renewSaveTheDateToken: vi.fn(() => of(EVENT)),
  };
  let useCase: EventsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: EventsRepository, useValue: repository }, EventsUseCase],
    });
    useCase = TestBed.inject(EventsUseCase);
  });

  it('passes reading on to the repository', async () => {
    expect(await firstValueFrom(useCase.getAll())).toEqual([EVENT]);
    expect(await firstValueFrom(useCase.getById('e1'))).toBe(EVENT);
    expect(repository.getById).toHaveBeenCalledWith('e1');
  });

  it('passes writing on to the repository', async () => {
    await firstValueFrom(useCase.create(DRAFT));
    await firstValueFrom(useCase.update('e1', DRAFT));
    await firstValueFrom(useCase.delete('e1'), { defaultValue: undefined });

    expect(repository.create).toHaveBeenCalledWith(DRAFT);
    expect(repository.update).toHaveBeenCalledWith('e1', DRAFT);
    expect(repository.delete).toHaveBeenCalledWith('e1');
  });

  it('passes the images on to the repository', async () => {
    const file = new File(['a'], 'a.png');
    await firstValueFrom(useCase.uploadImages('e1', [file]));
    await firstValueFrom(useCase.reorderImages('e1', [IMAGE]));
    await firstValueFrom(useCase.deleteImage('e1', 'i1'));

    expect(repository.uploadImages).toHaveBeenCalledWith('e1', [file]);
    expect(repository.reorderImages).toHaveBeenCalledWith('e1', [IMAGE]);
    expect(repository.deleteImage).toHaveBeenCalledWith('e1', 'i1');
  });

  it('passes save the date on to the repository', async () => {
    expect(await firstValueFrom(useCase.setSaveTheDate('e1', 'Bald mehr'))).toBe(EVENT);
    expect(await firstValueFrom(useCase.removeSaveTheDate('e1'))).toBe(EVENT);
    expect(await firstValueFrom(useCase.renewSaveTheDateToken('e1'))).toBe(EVENT);

    expect(repository.setSaveTheDate).toHaveBeenCalledWith('e1', 'Bald mehr');
    expect(repository.removeSaveTheDate).toHaveBeenCalledWith('e1');
    expect(repository.renewSaveTheDateToken).toHaveBeenCalledWith('e1');
  });
});
