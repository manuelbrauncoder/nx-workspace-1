import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { THEME_STORAGE_KEY, ThemeService } from '@core/theme/theme.service';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the toaster next to the routed content', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).not.toBeNull();
    expect(compiled.querySelector('app-ui-toaster')).not.toBeNull();
  });

  it('should swap the favicon with the theme', async () => {
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/svg+xml';
    icon.href = 'favicon.svg';
    document.head.append(icon);
    const theme = TestBed.inject(ThemeService);

    try {
      theme.setMode('dark');
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      expect(icon.getAttribute('href')).toBe('favicon-dark.svg');

      theme.setMode('light');
      await fixture.whenStable();
      expect(icon.getAttribute('href')).toBe('favicon.svg');
    } finally {
      icon.remove();
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  });
});
