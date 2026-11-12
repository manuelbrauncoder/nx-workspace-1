import { RESPONSE_INIT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFound } from './not-found';

describe('NotFound', () => {
  it('explains that the page is missing and links to the start page', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('Seite nicht gefunden');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/');
  });

  it('answers with status 404 on the server', () => {
    const response: ResponseInit = {};
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RESPONSE_INIT, useValue: response }],
    });
    TestBed.createComponent(NotFound);

    expect(response.status).toBe(404);
  });

  it('has no accessibility violations', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();

    await expect(fixture.nativeElement as HTMLElement).toBeAccessible();
  });
});
