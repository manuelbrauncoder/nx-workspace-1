import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AppConfigService } from '@core/config/app-config';
import { adminGuard, authGuard, guestGuard, signUpGuard } from './auth.guards';
import { AuthStore } from './auth.store';

@Component({ template: '' })
class Page {}

describe('auth guards', () => {
  const isSignedIn = signal(false);
  const isAdmin = signal(false);
  let allowSignUp = true;

  async function navigate(url: string): Promise<string> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: Page },
          { path: 'notes', canActivate: [authGuard], component: Page },
          { path: 'notes/:id', canActivate: [authGuard], component: Page },
          { path: 'admin', canActivate: [adminGuard], component: Page },
          { path: 'sign-in', canActivate: [guestGuard], component: Page },
          { path: 'sign-up', canActivate: [guestGuard, signUpGuard], component: Page },
          { path: 'showcase', component: Page },
        ]),
        { provide: AuthStore, useValue: { isSignedIn, isAdmin } },
        { provide: AppConfigService, useValue: { allowSignUp } },
      ],
    });
    await RouterTestingHarness.create(url);
    return TestBed.inject(Router).url;
  }

  beforeEach(() => {
    isSignedIn.set(false);
    isAdmin.set(false);
    allowSignUp = true;
  });

  describe('authGuard', () => {
    it('lets a signed-in user through', async () => {
      isSignedIn.set(true);

      expect(await navigate('/notes')).toBe('/notes');
    });

    it('sends everyone else to the sign-in page and remembers the page', async () => {
      expect(await navigate('/notes/1?tab=a')).toBe('/sign-in?returnUrl=%2Fnotes%2F1%3Ftab%3Da');
    });
  });

  describe('guestGuard', () => {
    it('lets a signed-out user through', async () => {
      expect(await navigate('/sign-in')).toBe('/sign-in');
    });

    it('sends a signed-in user to the start page', async () => {
      isSignedIn.set(true);

      expect(await navigate('/sign-in')).toBe('/');
    });

    it('sends a signed-in user on to the page they came for', async () => {
      isSignedIn.set(true);

      expect(await navigate('/sign-in?returnUrl=%2Fshowcase')).toBe('/showcase');
    });

    it('ignores a return URL that leaves the app', async () => {
      isSignedIn.set(true);

      expect(await navigate('/sign-in?returnUrl=%2F%2Fevil.example')).toBe('/');
    });
  });

  describe('signUpGuard', () => {
    it('opens the sign-up page while sign-up is allowed', async () => {
      expect(await navigate('/sign-up')).toBe('/sign-up');
    });

    it('sends visitors to the sign-in page while sign-up is off and keeps the return URL', async () => {
      allowSignUp = false;

      expect(await navigate('/sign-up?returnUrl=%2Fnotes')).toBe('/sign-in?returnUrl=%2Fnotes');
    });
  });

  describe('adminGuard', () => {
    it('lets an admin through', async () => {
      isSignedIn.set(true);
      isAdmin.set(true);

      expect(await navigate('/admin')).toBe('/admin');
    });

    it('sends a signed-in user without admin rights to the start page', async () => {
      isSignedIn.set(true);

      expect(await navigate('/admin')).toBe('/');
    });

    it('sends a signed-out user to the sign-in page', async () => {
      expect(await navigate('/admin')).toBe('/sign-in?returnUrl=%2Fadmin');
    });
  });
});
