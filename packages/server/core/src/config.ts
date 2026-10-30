import { readFileSync } from 'node:fs';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CONFIG_PATH: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
});

/** What every API app has in its config file. An app adds its own keys with `extendConfig()`. */
const baseFileSchema = z.object({
  port: z.number().int().positive(),
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']),
  trustProxy: z.union([z.boolean(), z.number().int().nonnegative()]),
  cors: z.object({
    // normalized to the form browsers send in the Origin header (no trailing slash)
    origins: z.array(z.url().transform((url) => new URL(url).origin)).min(1),
  }),
  session: z.object({
    cookieName: z.string().min(1),
    maxAgeDays: z.number().positive(),
    secureCookie: z.boolean(),
  }),
  rateLimit: z.object({
    authWindowMinutes: z.number().positive(),
    authMaxRequests: z.number().int().positive(),
  }),
  // the first admin, created at startup while no admin exists (see @server/auth)
  admin: z.object({
    email: z.email(),
    password: z.string().min(8).max(128),
  }),
  // serves the OpenAPI spec and Swagger UI under /docs
  docs: z.object({ enabled: z.boolean() }),
});

function fail(message: string): never {
  console.error(`Invalid configuration: ${message}`);
  process.exit(1);
}

function readEnv() {
  const env = envSchema.safeParse(process.env);
  if (!env.success) fail(`environment variables\n${z.prettifyError(env.error)}`);
  return env.data;
}

function readFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`cannot read ${path}: ${(error as Error).message}`);
  }
}

function parseFile<T extends z.ZodType>(schema: T, path: string, json: unknown): z.output<T> {
  const file = schema.safeParse(json);
  if (!file.success) fail(`${path}\n${z.prettifyError(file.error)}`);
  return file.data;
}

const env = readEnv();
const json = readFile(env.CONFIG_PATH);

/** The settings every API app shares, read once at startup. */
export const config = Object.freeze({
  ...parseFile(baseFileSchema, env.CONFIG_PATH, json),
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  sessionSecret: env.SESSION_SECRET,
});

export type Config = typeof config;

/**
 * The shared settings plus the keys of one app, read from the same file.
 *
 * @example
 * export const config = extendConfig({
 *   uploads: z.object({ dir: z.string().min(1) }),
 * });
 */
export function extendConfig<T extends z.ZodRawShape>(shape: T) {
  const own = parseFile(z.object(shape), env.CONFIG_PATH, json);
  return Object.freeze({ ...config, ...own });
}
