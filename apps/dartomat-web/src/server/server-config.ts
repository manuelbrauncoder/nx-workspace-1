import { AppConfig, isAppConfig, normalizeAppConfig } from '@core/config/app-config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CONFIG_FILE = 'config/app-config.json';

function readConfigFile(path: string): AppConfig | undefined {
  try {
    const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return isAppConfig(raw) ? normalizeAppConfig(raw) : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Reads the mounted runtime config, the same file the client loads. The built server finds it
 * next to the browser files. `ng serve` builds in memory, so there the file in the project root
 * is read instead. Returns `undefined` when the file is missing or invalid.
 */
export function readServerConfig(browserDistFolder: string): AppConfig | undefined {
  return (
    readConfigFile(join(browserDistFolder, CONFIG_FILE)) ??
    readConfigFile(join(process.cwd(), CONFIG_FILE))
  );
}
