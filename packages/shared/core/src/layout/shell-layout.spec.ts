import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { shellLayout, shellLayoutOf } from './shell-layout';

@Component({ template: '' })
class Page {}

describe('shellLayoutOf', () => {
  async function layoutAt(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'wide',
            data: shellLayout('full-bleed'),
            children: [
              { path: '', component: Page },
              { path: 'narrow', component: Page, data: shellLayout('contained') },
            ],
          },
          { path: 'plain', component: Page },
        ]),
      ],
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return shellLayoutOf(router.routerState.snapshot.root);
  }

  it('puts a page without a layout into the container', async () => {
    expect(await layoutAt('/plain')).toBe('contained');
  });

  it('takes the layout of a parent route', async () => {
    expect(await layoutAt('/wide')).toBe('full-bleed');
  });

  it('lets a child route replace the layout of its parent', async () => {
    expect(await layoutAt('/wide/narrow')).toBe('contained');
  });
});
