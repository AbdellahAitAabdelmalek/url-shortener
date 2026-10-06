import { sql } from 'drizzle-orm';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { Database } from '../db/client';

const HealthResponseSchema = z.object({ status: z.enum(['ok', 'unavailable']) });

export const healthRoutes: FastifyPluginAsyncZod<{ db: Database }> = async (app, { db }) => {
  app.get(
    '/health',
    { schema: { response: { 200: HealthResponseSchema, 503: HealthResponseSchema } } },
    async (request, reply) => {
      try {
        await db.execute(sql`select 1`);
        return { status: 'ok' as const };
      } catch (error) {
        request.log.error({ err: error }, 'Database health check failed');
        return reply.code(503).send({ status: 'unavailable' });
      }
    },
  );
};
