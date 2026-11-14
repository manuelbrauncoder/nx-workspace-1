import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_NAME } from '@core/app-name';
import { APP_VERSION } from '@core/app-version';
import { AppFooter } from './app-footer';

describe('AppFooter', () => {
  function render(version: string | undefined) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: APP_NAME, useValue: 'Vyte' },
        { provide: APP_VERSION, useValue: version },
      ],
    });
    const fixture = TestBed.createComponent(AppFooter);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows copyright and version as two spans without a middle dot', () => {
    const element = render('1.2.3');

    const spans = Array.from(element.querySelectorAll('p.app-footer__meta > span'));
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toContain('Vyte');
    expect(spans[1].textContent?.trim()).toBe('Version 1.2.3');
    expect(element.textContent).not.toContain('·');
  });

  it('leaves out the version when there is none', () => {
    const element = render(undefined);

    expect(element.querySelector('.app-footer__version')).toBeNull();
    expect(element.querySelectorAll('p.app-footer__meta > span')).toHaveLength(1);
  });

  it('has no accessibility violations', async () => {
    const element = render('1.2.3');

    await expect(element).toBeAccessible();
  });
});
