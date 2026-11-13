import { TestBed } from '@angular/core/testing';
import { UploadsRepository } from '@api/upload/uploads.repository';
import { of } from 'rxjs';
import { UploadLink } from './upload';
import { UploadUseCase } from './upload.usecase';

const LINK: UploadLink = { kind: 'stand', token: 'tok' };

describe('UploadUseCase', () => {
  const repository = {
    get: vi.fn(),
    registerDevice: vi.fn(),
    upload: vi.fn(),
    deletePhoto: vi.fn(),
    photoUrl: vi.fn(),
  };
  let useCase: UploadUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: UploadsRepository, useValue: repository }, UploadUseCase],
    });
    useCase = TestBed.inject(UploadUseCase);
  });

  it.each([
    ['get', 'get', [LINK]],
    ['registerDevice', 'registerDevice', ['tok']],
    ['deletePhoto', 'deletePhoto', [LINK, 'p1']],
  ] as const)('passes %s through to the repository', (method, repositoryMethod, args) => {
    const result = of(undefined);
    repository[repositoryMethod].mockReturnValue(result);

    expect((useCase[method] as (...a: unknown[]) => unknown)(...args)).toBe(result);
    expect(repository[repositoryMethod]).toHaveBeenCalledWith(...args);
  });

  it('passes the file and the name of an upload through', () => {
    const result = of(undefined);
    const file = new File(['x'], 'a.jpg');
    repository.upload.mockReturnValue(result);

    expect(useCase.upload(LINK, file, 'Ada')).toBe(result);
    expect(repository.upload).toHaveBeenCalledWith(LINK, file, 'Ada');
  });

  it('passes the address of a photo through', () => {
    repository.photoUrl.mockReturnValue('https://api.example.com/p');

    expect(useCase.photoUrl(LINK, 'p1')).toBe('https://api.example.com/p');
    expect(repository.photoUrl).toHaveBeenCalledWith(LINK, 'p1');
  });
});
