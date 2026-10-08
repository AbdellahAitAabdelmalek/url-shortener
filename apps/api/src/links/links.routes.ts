import { ApiErrorSchema, CreateLinkBodySchema, type Link, LinkSchema } from '@url-shortener/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
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
}> = async (app, { service, publicBaseUrl }) => {
  app.post(
    '/api/links',
    {
      schema: {
        body: CreateLinkBodySchema,
        response: { 200: LinkSchema, 201: LinkSchema, 400: ApiErrorSchema },
      },
    },
    async (request, reply) => {
      // request.body.url has been validated and normalized by CreateLinkBodySchema.
      const { link, created } = await service.create(request.body.url);
      // 201 for a new link, 200 when the URL had already been shortened.
      return reply.code(created ? 201 : 200).send(toLinkDto(link, publicBaseUrl));
    },
  );
};
