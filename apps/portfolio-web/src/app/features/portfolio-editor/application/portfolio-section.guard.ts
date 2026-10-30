import { CanMatchFn } from '@angular/router';
import { isPortfolioSectionName } from '../domain/portfolio';

/**
 * Matches `:section` only for a section that exists. Any other path falls through to the
 * not-found route, which answers with 404.
 */
export const portfolioSectionMatch: CanMatchFn = (_route, segments) =>
  isPortfolioSectionName(segments[0]?.path);
