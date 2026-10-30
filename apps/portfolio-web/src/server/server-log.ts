import { Log } from '@core/log/log';
import { LogLevel } from '@core/log/log-level';

/** Logger of the Express server, the counterpart of `AppLog`. Use it instead of `console`. */
export class ServerLog extends Log {
  protected readonly source = 'server';
  protected readonly color = 'magenta';

  constructor(protected readonly level: LogLevel) {
    super();
  }
}
