import { TestBed } from '@angular/core/testing';
import { THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to system mode', () => {
    expect(TestBed.inject(ThemeService).mode()).toBe('system');
  });

  it('applies the dark class and persists the mode', () => {
    const service = TestBed.inject(ThemeService);

    service.setMode('dark');
    TestBed.tick();

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
  });

  it('removes the dark class for light mode', () => {
    const service = TestBed.inject(ThemeService);
    service.setMode('dark');
    TestBed.tick();

    service.setMode('light');
    TestBed.tick();

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('restores the stored mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark');

    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
  });
});
