import { HttpErrorResponse } from '@angular/common/http';
import { Failure } from './failure';
import { toFailure } from './to-failure';

describe('toFailure', () => {
  it('returns a failure unchanged', () => {
    const failure = new Failure('forbidden', 'Nein');

    expect(toFailure(failure)).toBe(failure);
  });

  it.each([
    [0, 'network'],
    [400, 'bad-request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [429, 'too-many-requests'],
    [422, 'bad-request'],
    [500, 'server'],
    [503, 'server'],
  ] as const)('maps HTTP status %i to kind %s', (status, kind) => {
    const failure = toFailure(new HttpErrorResponse({ status }));

    expect(failure).toBeInstanceOf(Failure);
    expect(failure).toMatchObject({ kind, status });
  });

  it('prefers the message sent by the backend', () => {
    const response = new HttpErrorResponse({
      status: 400,
      error: { error: { message: 'Validation failed', details: [] } },
    });

    expect(toFailure(response).message).toBe('Validation failed');
  });

  it('falls back to a default message and keeps the cause', () => {
    const response = new HttpErrorResponse({ status: 404, error: '<html>' });
    const failure = toFailure(response);

    expect(failure.message).toBe('The entry was not found.');
    expect(failure.cause).toBe(response);
  });

  it('unwraps a failure that was wrapped in another error', () => {
    const failure = new Failure('server', 'Kaputt');

    expect(toFailure(new Error('wrapped', { cause: failure }))).toBe(failure);
  });

  it('turns anything else into an unknown failure', () => {
    const error = new TypeError('x is undefined');

    expect(toFailure(error)).toMatchObject({ kind: 'unknown', status: undefined, cause: error });
    expect(toFailure('boom').kind).toBe('unknown');
  });
});
