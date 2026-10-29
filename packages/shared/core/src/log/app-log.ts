import { inject, Service } from '@angular/core';
import { AppConfigService } from '../config/app-config';
import { Log } from './log';
import { LogLevel } from './log-level';

/** Logger of the Angular app. Use it instead of `console`, the level comes from the runtime config. */
@Service()
export class AppLog extends Log {
  private readonly _config = inject(AppConfigService);

  protected readonly source = 'app';
  protected readonly color = 'cyan';

  protected get level(): LogLevel {
    return this._config.logLevel;
  }
}
