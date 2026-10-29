/** Ordered from most to least verbose. `off` disables logging entirely. */
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'off'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/** Used until the config is loaded, and on the server when the config cannot be read. */
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

export const isLogLevel = (value: unknown): value is LogLevel =>
  LOG_LEVELS.some((level) => level === value);
