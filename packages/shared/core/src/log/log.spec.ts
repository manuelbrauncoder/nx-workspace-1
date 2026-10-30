import { Log, LogColorMode } from './log';
import { LogLevel } from './log-level';

class TestLog extends Log {
  protected readonly source = 'test';
  protected readonly color = 'cyan';

  constructor(
    protected readonly level: LogLevel,
    protected override readonly colorMode: LogColorMode = 'none',
  ) {
    super();
  }
}

const METHODS = ['debug', 'info', 'warn', 'error'] as const;

describe('Log', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-12T09:00:00.000Z'));
    METHODS.forEach((method) => vi.spyOn(console, method).mockImplementation(() => undefined));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('writes emoji, time, level and source as prefix, followed by the message', () => {
    new TestLog('debug').info('Gestartet');

    expect(console.info).toHaveBeenCalledWith(
      '💡 2026-01-12T09:00:00.000Z INFO [test]',
      'Gestartet',
    );
  });

  it('writes a notice at every level except off', () => {
    new TestLog('error').notice('Gestartet');
    new TestLog('off').notice('Gestartet');

    expect(console.info).toHaveBeenCalledTimes(1);
    expect(console.info).toHaveBeenCalledWith(
      '💡 2026-01-12T09:00:00.000Z INFO [test]',
      'Gestartet',
    );
  });

  it.each([
    ['debug', '🐛'],
    ['info', '💡'],
    ['warn', '🚧'],
    ['error', '❌'],
  ] as const)('marks %s entries with %s', (level, emoji) => {
    new TestLog('debug')[level]('x');

    expect(console[level]).toHaveBeenCalledWith(expect.stringMatching(`^${emoji} `), 'x');
  });

  it('colors the prefix with CSS in the browser', () => {
    new TestLog('debug', 'css').info('Gestartet');

    expect(console.info).toHaveBeenCalledWith(
      '%c💡 2026-01-12T09:00:00.000Z INFO [test]',
      'color: #0891b2',
      'Gestartet',
    );
  });

  it('colors the prefix with ANSI codes in a terminal', () => {
    new TestLog('debug', 'ansi').info('Gestartet');

    expect(console.info).toHaveBeenCalledWith(
      '\x1b[36m💡 2026-01-12T09:00:00.000Z INFO [test]\x1b[0m',
      'Gestartet',
    );
  });

  it('passes additional data on unchanged', () => {
    const error = new Error('boom');

    new TestLog('debug').error('Kaputt', error, { id: 1 });

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('ERROR [test]'),
      'Kaputt',
      error,
      { id: 1 },
    );
  });

  it.each([
    ['debug', ['debug', 'info', 'warn', 'error']],
    ['info', ['info', 'warn', 'error']],
    ['warn', ['warn', 'error']],
    ['error', ['error']],
    ['off', []],
  ] as const)('with level %s only writes %j', (level, expected) => {
    const log = new TestLog(level);

    METHODS.forEach((method) => log[method]('x'));

    const written = METHODS.filter((method) => vi.mocked(console[method]).mock.calls.length > 0);
    expect(written).toEqual(expected);
  });
});
