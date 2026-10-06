import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import { createDatabase } from './db/client';
import { healthRoutes } from './health/health.routes';

function loggerOptions(config: Config): FastifyServerOptions['logger'] {
  if (config.NODE_ENV === 'development') {
    return {
      level: config.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
    };
  }
  return { level: config.LOG_LEVEL };
}

export async function buildApp(config: Config) {
  const app = Fastify({ logger: loggerOptions(config) }).withTypeProvider<ZodTypeProvider>();

  // Zod schemas validate requests and serialize responses.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  const { pool, db } = createDatabase(config.DATABASE_URL);
  // An idle client emits 'error' when the database drops the connection:
  // without a listener, Node crashes the whole process.
  pool.on('error', (err) => app.log.error({ err }, 'Idle database client error'));
  app.addHook('onClose', () => pool.end());

  await app.register(healthRoutes, { db });

  return app;
}
