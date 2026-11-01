import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { of, throwError } from 'rxjs';
import { ContactUseCase } from '../domain/contact.usecase';
import { ContactStore } from './contact.store';

const MESSAGE = { name: 'Ada', email: 'ada@example.com', message: 'Hallo!' };

describe('ContactStore', () => {
  const send = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [ContactStore, { provide: ContactUseCase, useValue: { send } }],
    });
  });

  it('reports a sent message', async () => {
    send.mockReturnValue(of(undefined));
    const store = TestBed.inject(ContactStore);

    expect(await store.send(MESSAGE)).toBe(true);
    expect(send).toHaveBeenCalledWith(MESSAGE);
    expect(store.mutationState().loadingState).toBe('success');
  });

  it('keeps the failure when sending fails and drops it on reset', async () => {
    send.mockReturnValue(throwError(() => new Failure('network', 'Offline')));
    const store = TestBed.inject(ContactStore);

    expect(await store.send(MESSAGE)).toBe(false);
    expect(store.mutationState().failure?.kind).toBe('network');

    store.reset();

    expect(store.mutationState().loadingState).toBe('idle');
  });
});
