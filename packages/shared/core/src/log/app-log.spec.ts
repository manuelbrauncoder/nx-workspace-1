import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../config/app-config';
import { AppLog } from './app-log';
import { LogLevel } from './log-level';

describe('AppLog', () => {
  function setup(logLevel: LogLevel): AppLog {
    TestBed.configureTestingModule({
      providers: [{ provide: AppConfigService, useValue: { logLevel } }],
    });
    return TestBed.inject(AppLog);
  }

  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => vi.restoreAllMocks());

  it('writes entries at or above the configured level, marked as coming from the app', () => {
    setup('warn').warn('Achtung');

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('WARN [app]'),
      expect.any(String),
      'Achtung',
    );
  });

  it('drops entries below the configured level', () => {
    setup('warn').info('Nur zur Info');

    expect(console.info).not.toHaveBeenCalled();
  });
});
