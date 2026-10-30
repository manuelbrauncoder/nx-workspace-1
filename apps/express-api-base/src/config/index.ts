import { readFileSync } from 'node:fs';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CONFIG_PATH: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
});

const fileSchema = z.object({
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
  // the first admin, created at startup while no admin exists (see admin.seed.ts)
  admin: z.object({
    email: z.email(),
    password: z.string().min(8).max(128),
  }),
  // serves the OpenAPI spec and Swagger UI under /docs
  docs: z.object({ enabled: z.boolean() }),
  uploads: z.object({
    dir: z.string().min(1),
    maxFileSizeMb: z.number().positive(),
    maxImagesPerNote: z.number().int().positive(),
    maxImageWidth: z.number().int().positive(),
  }),
});

function fail(message: string): never {
  console.error(`Invalid configuration: ${message}`);
  process.exit(1);
}

function loadConfig() {
  const env = envSchema.safeParse(process.env);
  if (!env.success) fail(`environment variables\n${z.prettifyError(env.error)}`);

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(env.data.CONFIG_PATH, 'utf8'));
  } catch (error) {
    fail(`cannot read ${env.data.CONFIG_PATH}: ${(error as Error).message}`);
  }

  const file = fileSchema.safeParse(json);
  if (!file.success) fail(`${env.data.CONFIG_PATH}\n${z.prettifyError(file.error)}`);

  return Object.freeze({
    ...file.data,
    nodeEnv: env.data.NODE_ENV,
    databaseUrl: env.data.DATABASE_URL,
    sessionSecret: env.data.SESSION_SECRET,
  });
}

export const config = loadConfig();
