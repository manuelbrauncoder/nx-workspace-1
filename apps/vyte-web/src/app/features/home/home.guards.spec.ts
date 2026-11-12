import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '@features/auth/public-api';
import { visitorsOnlyGuard } from './home.guards';

@Component({ template: '' })
class Page {}

describe('visitorsOnlyGuard', () => {
  async function navigate(signedIn: boolean): Promise<string> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', canActivate: [visitorsOnlyGuard], component: Page },
          { path: 'events', component: Page },
        ]),
        { provide: AuthStore, useValue: { isSignedIn: signal(signedIn) } },
      ],
    });
    await RouterTestingHarness.create('/');
    return TestBed.inject(Router).url;
  }

  it('shows the start page to a visitor', async () => {
    expect(await navigate(false)).toBe('/');
  });

  it('sends a signed-in user to their events', async () => {
    expect(await navigate(true)).toBe('/events');
  });
});
