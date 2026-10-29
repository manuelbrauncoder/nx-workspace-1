import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppErrorHandler } from './app-error-handler';
import { AppLog } from './app-log';

describe('AppErrorHandler', () => {
  it('logs an unhandled error together with the original error', () => {
    const error = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorHandler, useClass: AppErrorHandler },
        { provide: AppLog, useValue: { error } },
      ],
    });
    const cause = new TypeError('x is undefined');

    TestBed.inject(ErrorHandler).handleError(cause);

    expect(error).toHaveBeenCalledWith('Unhandled error', cause);
  });
});
