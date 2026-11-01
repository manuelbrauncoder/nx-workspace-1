import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { PortfolioStore } from './portfolio.store';

/**
 * Loads the content before the start page opens. Never blocks the page: a failure is shown
 * there, with a way to try again.
 */
export const loadPortfolio: CanActivateFn = async () => {
  await inject(PortfolioStore).load();
  return true;
};
