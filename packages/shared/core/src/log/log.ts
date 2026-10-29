import { LOG_LEVELS, LogLevel } from './log-level';

type WritableLevel = Exclude<LogLevel, 'off'>;

const EMOJIS: Record<WritableLevel, string> = { debug: '🐛', info: '💡', warn: '🚧', error: '❌' };

/** Each color as ANSI code for the terminal and as CSS for the browser console. */
const COLORS = {
  cyan: { ansi: 36, css: '#0891b2' },
  magenta: { ansi: 35, css: '#c026d3' },
} as const;

export type LogColor = keyof typeof COLORS;

/** How the prefix is colored: `css` in the browser, `ansi` in a terminal, `none` otherwise. */
export type LogColorMode = 'css' | 'ansi' | 'none';

/** Piped output, e.g. container logs, stays free of escape codes unless `FORCE_COLOR` is set. */
function detectColorMode(): LogColorMode {
  if (typeof window !== 'undefined') {
    return 'css';
  }
  const { env, stdout } = process;
  if (env['NO_COLOR']) {
    return 'none';
  }
  return env['FORCE_COLOR'] || stdout.isTTY ? 'ansi' : 'none';
}

/**
 * Shared base of `AppLog` and `ServerLog`, so both write the same format. This is the only
 * place that talks to `console`, everything else logs through one of the two.
 */
export abstract class Log {
  /** Tells app and server lines apart, since both end up in the server output during SSR. */
  protected abstract readonly source: string;

  /** Color of the prefix, a different one per source. */
  protected abstract readonly color: LogColor;

  protected readonly colorMode: LogColorMode = detectColorMode();

  /** Entries below this level are dropped. */
  protected abstract get level(): LogLevel;

  debug(message: string, ...data: unknown[]): void {
    this._write('debug', message, data);
  }

  info(message: string, ...data: unknown[]): void {
    this._write('info', message, data);
  }

  warn(message: string, ...data: unknown[]): void {
    this._write('warn', message, data);
  }

  error(message: string, ...data: unknown[]): void {
    this._write('error', message, data);
  }

  /**
   * For the few lines that say what is running, e.g. port and environment at startup. Written
   * as `info` at every level except `off`, so they also show up where only warnings are logged.
   */
  notice(message: string, ...data: unknown[]): void {
    this._write('info', message, data, true);
  }

  private _write(level: WritableLevel, message: string, data: unknown[], always = false): void {
    const belowLevel = LOG_LEVELS.indexOf(level) < LOG_LEVELS.indexOf(this.level);
    if (this.level === 'off' || (belowLevel && !always)) {
      return;
    }
    const prefix = `${EMOJIS[level]} ${new Date().toISOString()} ${level.toUpperCase()} [${this.source}]`;
    // Message and data are separate arguments: a `%` in the message is not read as a format
    // directive, and objects and errors stay inspectable in the browser.
    console[level](...this._colored(prefix), message, ...data);
  }

  private _colored(prefix: string): string[] {
    const { ansi, css } = COLORS[this.color];
    switch (this.colorMode) {
      case 'css':
        return [`%c${prefix}`, `color: ${css}`];
      case 'ansi':
        return [`\x1b[${ansi}m${prefix}\x1b[0m`];
      case 'none':
        return [prefix];
    }
  }
}
