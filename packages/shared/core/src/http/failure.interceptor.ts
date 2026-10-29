import { HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { toFailure } from '../failure/to-failure';

/** Turns every failed request into a `Failure`, so callers handle a single error type. */
export const failureInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toFailure(error))));
