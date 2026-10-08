import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.string().default('localhost'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  // Origin where short links are served (GET /:code), e.g. https://sho.rt
  PUBLIC_BASE_URL: z.url(),
  // Absolute path to the built front-end. Unset in development, where Vite serves it.
  STATIC_DIR: z.string().optional(),
});

export type Config = z.infer<typeof EnvSchema>;

/** Validates the environment once at startup: a misconfigured app must not boot. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
