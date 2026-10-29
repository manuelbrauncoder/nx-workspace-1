import { Failure } from '@core/failure/failure';
import { of, Subject, throwError } from 'rxjs';
import { mutation } from './mutation';

describe('mutation', () => {
  it('starts idle', () => {
    expect(mutation().state()).toEqual({ loadingState: 'idle', failure: undefined });
  });

  it('goes from loading to success and resolves with the result', async () => {
    const response = new Subject<string>();
    const save = mutation();

    const result = save.run(response);
    expect(save.state().loadingState).toBe('loading');

    response.next('saved');
    response.complete();

    expect(await result).toBe('saved');
    expect(save.state()).toEqual({ loadingState: 'success', failure: undefined });
  });

  it('resolves with undefined and exposes the failure when the write fails', async () => {
    const save = mutation();

    expect(await save.run(throwError(() => new Error('Speichern nicht möglich')))).toBeUndefined();

    expect(save.state().loadingState).toBe('failure');
    expect(save.state().failure).toBeInstanceOf(Failure);
  });

  it('drops an earlier failure on reset', async () => {
    const save = mutation();
    await save.run(throwError(() => new Error('Speichern nicht möglich')));

    save.reset();

    expect(save.state()).toEqual({ loadingState: 'idle', failure: undefined });
  });

  it('keeps the state of two mutations apart', async () => {
    const save = mutation();
    const remove = mutation();

    await save.run(of('saved'));

    expect(save.state().loadingState).toBe('success');
    expect(remove.state().loadingState).toBe('idle');
  });
});
