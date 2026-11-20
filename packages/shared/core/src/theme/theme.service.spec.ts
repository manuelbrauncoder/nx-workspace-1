import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_THEME_MODE,
  FORCED_THEME_MODE,
  THEME_STORAGE_KEY,
  ThemeService,
} from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to system mode', () => {
    expect(TestBed.inject(ThemeService).mode()).toBe('system');
  });

  it('starts with the configured default mode when nothing is stored', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DEFAULT_THEME_MODE, useValue: 'dark' }],
    });
    TestBed.inject(ThemeService);
    TestBed.tick();

    expect(TestBed.inject(ThemeService).mode()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('prefers the stored mode over the configured default', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    TestBed.configureTestingModule({
      providers: [{ provide: DEFAULT_THEME_MODE, useValue: 'dark' }],
    });

    expect(TestBed.inject(ThemeService).mode()).toBe('light');
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

  it('keeps a forced mode regardless of the stored one and of setMode()', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    TestBed.configureTestingModule({
      providers: [{ provide: FORCED_THEME_MODE, useValue: 'dark' }],
    });
    const service = TestBed.inject(ThemeService);
    TestBed.tick();

    service.setMode('light');
    TestBed.tick();

    expect(service.mode()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});
