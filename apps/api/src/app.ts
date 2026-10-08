import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import type { Config } from './config';
import { createDatabase } from './db/client';
import { DomainError, registerErrorHandlers } from './errors';
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

  // Security headers: Content-Security-Policy, X-Content-Type-Options, Referrer-Policy...
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      // TLS is terminated in front of the app in production. Locally the app runs over plain
      // HTTP, where upgrading requests to HTTPS would break the page.
      directives: { upgradeInsecureRequests: null },
    },
  });

  // Opted in per route (global: false). The thrown DomainError becomes a 429 in the ApiError
  // format. Counters live in memory: several instances would need a shared store (Redis).
  await app.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: (_request, context) =>
      new DomainError('RATE_LIMITED', `Too many requests. Please try again in ${context.after}.`),
  });

  const { pool, db } = createDatabase(config.DATABASE_URL);
  // An idle client emits 'error' when the database drops the connection:
  // without a listener, Node crashes the whole process.
  pool.on('error', (err) => app.log.error({ err }, 'Idle database client error'));
  app.addHook('onClose', () => pool.end());

  const linksService = createLinksService({
    repository: createLinksRepository(db),
    publicBaseUrl: config.PUBLIC_BASE_URL,
  });

  await app.register(linksRoutes, {
    service: linksService,
    publicBaseUrl: config.PUBLIC_BASE_URL,
    rateLimitPerMinute: config.RATE_LIMIT_PER_MINUTE,
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
