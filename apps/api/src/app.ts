import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import { createDatabase } from './db/client';
import { registerErrorHandlers } from './errors';
import { healthRoutes } from './health/health.routes';
import { createLinksRepository } from './links/links.repository';
import { linksRoutes } from './links/links.routes';
import { createLinksService } from './links/links.service';

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
  const app = Fastify({
    logger: loggerOptions(config),
  }).withTypeProvider<ZodTypeProvider>();

  // Zod schemas validate requests and serialize responses.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandlers(app);

  const { pool, db } = createDatabase(config.DATABASE_URL);
  // An idle client emits 'error' when the database drops the connection:
  // without a listener, Node crashes the whole process.
  pool.on('error', (err) => app.log.error({ err }, 'Idle database client error'));
  app.addHook('onClose', () => pool.end());

  const linksService = createLinksService({
    repository: createLinksRepository(db),
    publicBaseUrl: config.PUBLIC_BASE_URL,
  });

  await app.register(healthRoutes, { db });
  await app.register(linksRoutes, {
    service: linksService,
    publicBaseUrl: config.PUBLIC_BASE_URL,
  });

  if (config.STATIC_DIR) {
    // Serves the built front-end from the same origin (no CORS). `wildcard: false` registers
    // one static route per file, which Fastify's router matches before a `/:code` route.
    await app.register(fastifyStatic, {
      root: config.STATIC_DIR,
      wildcard: false,
    });
  }

  return app;
}
