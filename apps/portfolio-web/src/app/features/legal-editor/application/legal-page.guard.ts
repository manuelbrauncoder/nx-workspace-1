import { CanMatchFn } from '@angular/router';
import { isLegalPageName } from '../domain/legal';

/**
 * Matches `:page` only for a legal page that exists. Any other path falls through to the
 * not-found route, which answers with 404.
 */
export const legalPageMatch: CanMatchFn = (_route, segments) => isLegalPageName(segments[0]?.path);
