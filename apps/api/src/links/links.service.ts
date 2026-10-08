import type { LinkRow } from '../db/schema';
import { DomainError } from '../errors';
import { generateCode as defaultGenerateCode } from './code';
import type { LinksRepository } from './links.repository';

// With a million links stored, a new code collides with probability 10^6 / 1.95 × 10^12, about
// 1 in 2 million: 5 collisions in a row mean something else is wrong.
const MAX_ATTEMPTS = 5;

export function createLinksService({
  repository,
  publicBaseUrl,
  generateCode = defaultGenerateCode,
}: {
  repository: LinksRepository;
  publicBaseUrl: string;
  generateCode?: () => string;
}) {
  const ownHostname = new URL(publicBaseUrl).hostname;

  return {
    /**
     * Returns the existing link when the URL has already been shortened: there is one link per
     * URL. `originalUrl` has already been validated and normalized by LongUrlSchema.
     */
    async create(originalUrl: string): Promise<{ link: LinkRow; created: boolean }> {
      // Shortening a short link would create a redirect chain, or a loop.
      if (new URL(originalUrl).hostname === ownHostname) {
        throw new DomainError('INVALID_TARGET', 'This URL is already a short link.');
      }

      const existing = await repository.findByOriginalUrl(originalUrl);
      if (existing) return { link: existing, created: false };

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const link = await repository.insert({ code: generateCode(), originalUrl });
        if (link) return { link, created: true };

        // Nothing inserted: either the code is taken, or a concurrent request has shortened the
        // same URL since the lookup above.
        const concurrent = await repository.findByOriginalUrl(originalUrl);
        if (concurrent) return { link: concurrent, created: false };
      }
      throw new Error(`No unique code found after ${MAX_ATTEMPTS} attempts`);
    },

    findByCode(code: string): Promise<LinkRow | null> {
      return repository.findByCode(code);
    },
  };
}

export type LinksService = ReturnType<typeof createLinksService>;
