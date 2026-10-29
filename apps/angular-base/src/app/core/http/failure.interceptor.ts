import { HttpInterceptorFn } from '@angular/common/http';
import { toFailure } from '@core/failure/to-failure';
import { catchError, throwError } from 'rxjs';

/** Turns every failed request into a `Failure`, so callers handle a single error type. */
export const failureInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError((error: unknown) => throwError(() => toFailure(error))));
