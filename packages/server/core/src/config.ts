import { readFileSync } from 'node:fs';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CONFIG_PATH: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
});

/**
 * What every API app has in its config file. An app adds its own keys with `extendConfig()`.
 * Keys added later have a default, so the file of an existing deployment stays valid.
 */
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
  // false closes POST /auth/sign-up, so only the admin and existing users can sign in
  auth: z.object({ signUpEnabled: z.boolean() }).default({ signUpEnabled: true }),
  // the first admin, created at startup while no admin exists (see @server/auth)
  admin: z.object({
    email: z.email(),
    password: z.string().min(8).max(128),
  }),
  // serves the OpenAPI spec and Swagger UI under /docs
  docs: z.object({ enabled: z.boolean() }),
  // where uploaded images are stored, see images.ts
  uploads: z
    .object({
      dir: z.string().min(1),
      maxFileSizeMb: z.number().positive(),
      maxImageWidth: z.number().int().positive(),
    })
    .default({ dir: './uploads', maxFileSizeMb: 10, maxImageWidth: 2000 }),
});

function fail(message: string): never {
  console.error(`Invalid configuration: ${message}`);
  process.exit(1);
}

function parse<T extends z.ZodType>(schema: T, data: unknown, source: string): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) fail(`${source}\n${z.prettifyError(result.error)}`);
  return result.data;
}

function readFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`cannot read ${path}: ${(error as Error).message}`);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Merges the keys of an app into the shared ones, one level deep, e.g. `uploads.maxImagesPerNote`. */
function merge<A extends object, B extends object>(base: A, own: B): A & B {
  const result: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(own)) {
    const current = result[key];
    result[key] = isPlainObject(current) && isPlainObject(value) ? { ...current, ...value } : value;
  }
  return result as A & B;
}

const env = parse(envSchema, process.env, 'environment variables');
const json = readFile(env.CONFIG_PATH);

/** The settings every API app shares, read once at startup. */
export const config = Object.freeze({
  ...parse(baseFileSchema, json, env.CONFIG_PATH),
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  sessionSecret: env.SESSION_SECRET,
});

export type Config = typeof config;

/**
 * The shared settings plus the keys of one app, read from the same file and environment. A key
 * the shared settings have too, such as `uploads`, is merged into them.
 *
 * @example
 * export const config = extendConfig(
 *   { uploads: z.object({ maxImagesPerNote: z.number().int().positive() }) },
 *   { SMTP_PASSWORD: z.string().optional() },
 * );
 */
export function extendConfig<
  F extends z.ZodRawShape,
  E extends z.ZodRawShape = Record<string, never>,
>(fileShape: F, envShape?: E) {
  const file = parse(z.object(fileShape), json, env.CONFIG_PATH);
  const ownEnv = parse(z.object(envShape ?? ({} as E)), process.env, 'environment variables');
  return Object.freeze(merge(merge(config, file), { env: ownEnv }));
}
