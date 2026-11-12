import { TestBed } from '@angular/core/testing';
import { InvitesRepository } from '@api/invites/invites.repository';
import { of } from 'rxjs';
import { InviteUseCase } from './invite.usecase';

describe('InviteUseCase', () => {
  const repository = { getByToken: vi.fn(), accept: vi.fn(), signUp: vi.fn() };
  let useCase: InviteUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: InvitesRepository, useValue: repository }, InviteUseCase],
    });
    useCase = TestBed.inject(InviteUseCase);
  });

  it('passes getByToken through to the repository', () => {
    const result = of({ eventTitle: 'Sommerfest' });
    repository.getByToken.mockReturnValue(result);

    expect(useCase.getByToken('tok')).toBe(result);
    expect(repository.getByToken).toHaveBeenCalledWith('tok');
  });

  it('passes accept through to the repository', () => {
    const result = of({ id: 'e1' });
    repository.accept.mockReturnValue(result);

    expect(useCase.accept('tok')).toBe(result);
    expect(repository.accept).toHaveBeenCalledWith('tok');
  });

  it('passes signUp through to the repository', () => {
    const result = of({ id: 'e1' });
    const registration = { name: 'Ada', email: 'ada@example.com', password: 'secret-pass' };
    repository.signUp.mockReturnValue(result);

    expect(useCase.signUp('tok', registration)).toBe(result);
    expect(repository.signUp).toHaveBeenCalledWith('tok', registration);
  });
});
