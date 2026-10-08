import {
  ApiErrorSchema,
  CreateLinkBodySchema,
  type Link,
  LinkSchema,
  ShortCodeSchema,
} from '@url-shortener/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { LinkRow } from '../db/schema';
import type { LinksService } from './links.service';

/** Maps a database row to the API contract: the two evolve independently. */
export function toLinkDto(row: LinkRow, publicBaseUrl: string): Link {
  return {
    code: row.code,
    shortUrl: new URL(`/${row.code}`, publicBaseUrl).href,
    originalUrl: row.originalUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

export const linksRoutes: FastifyPluginAsyncZod<{
  service: LinksService;
  publicBaseUrl: string;
  rateLimitPerMinute: number;
}> = async (app, { service, publicBaseUrl, rateLimitPerMinute }) => {
  app.post(
    '/api/links',
    {
      config: {
        rateLimit: { max: rateLimitPerMinute, timeWindow: '1 minute' },
      },
      schema: {
        body: CreateLinkBodySchema,
        response: { 200: LinkSchema, 201: LinkSchema, 400: ApiErrorSchema, 429: ApiErrorSchema },
      },
    },
    async (request, reply) => {
      // request.body.url has been validated and normalized by CreateLinkBodySchema.
      const { link, created } = await service.create(request.body.url);
      // 201 for a new link, 200 when the URL had already been shortened.
      return reply.code(created ? 201 : 200).send(toLinkDto(link, publicBaseUrl));
    },
  );

  app.get(
    '/:code',
    { schema: { params: z.object({ code: z.string() }) } },
    async (request, reply) => {
      // A browser follows this link: an unknown or malformed code shows the 404 page rather than
      // a JSON error. A malformed code is rejected without querying the database.
      const code = ShortCodeSchema.safeParse(request.params.code);
      const link = code.success ? await service.findByCode(code.data) : null;
      if (!link) {
        reply.callNotFound();
        return reply;
      }

      // 302, not 301: browsers cache a 301 for good, so the link could no longer be disabled or
      // its clicks counted. The target was validated at creation: http or https only.
      return reply.redirect(link.originalUrl, 302);
    },
  );
};
