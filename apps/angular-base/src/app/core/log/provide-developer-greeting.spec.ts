import { APP_BOOTSTRAP_LISTENER, ComponentRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '../config/app-config';
import { AppLog } from './app-log';
import { provideDeveloperGreeting } from './provide-developer-greeting';

describe('provideDeveloperGreeting', () => {
  const info = vi.fn();

  function bootstrap(platformId: string): void {
    TestBed.configureTestingModule({
      providers: [
        provideDeveloperGreeting(),
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: AppConfigService, useValue: { environment: 'staging', logLevel: 'debug' } },
        { provide: AppLog, useValue: { info } },
      ],
    });
    const componentRef = {} as ComponentRef<unknown>;
    TestBed.inject(APP_BOOTSTRAP_LISTENER).forEach((listener) => listener(componentRef));
  }

  beforeEach(() => info.mockClear());

  it('greets developers in the browser with environment and log level', () => {
    bootstrap('browser');

    expect(info).toHaveBeenCalledExactlyOnceWith(
      '👋 Hello developer, welcome to angular-base! Environment: staging, log level: debug.',
    );
  });

  it('stays silent during server rendering', () => {
    bootstrap('server');

    expect(info).not.toHaveBeenCalled();
  });
});
