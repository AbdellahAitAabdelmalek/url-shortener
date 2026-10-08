import { z } from 'zod';

/** Letters and digits, minus the ones easy to confuse when reading a link: 0/O and 1/l/I. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const CODE_LENGTH = 7;
export const MAX_URL_LENGTH = 2048;

export const ShortCodeSchema = z
  .string()
  .length(CODE_LENGTH)
  .regex(new RegExp(`^[${CODE_ALPHABET}]+$`));

const startsWithScheme = /^[a-z][a-z\d+.-]*:\/\//i;

export const LongUrlSchema = z
  .string()
  .trim()
  .min(1, 'Please enter a URL.')
  // Users often paste "stoik.com": assume https when no scheme is given.
  .transform((input) => (startsWithScheme.test(input) ? input : `https://${input}`))
  .pipe(
    z
      .url({
        // Web links only: rejects javascript:, data:, file:, ftp:...
        protocol: /^https?$/,
        // A public domain name: rejects localhost, IP addresses and single words.
        hostname: z.regexes.domain,
        // Returns the WHATWG serialization (URL.href): lowercase scheme and host, no default
        // port, ASCII only (punycode host, percent-encoded path). Two spellings of the same URL
        // become one, which is what makes original URLs unique in the database.
        normalize: true,
        error: 'Please enter a valid URL, like https://example.com.',
      })
      // Checked on the normalized URL: once ASCII only, 2048 characters are 2048 bytes, under
      // the 2704 bytes PostgreSQL accepts in a B-tree index entry (the unique index on the URL).
      .max(MAX_URL_LENGTH, `This URL is too long (${MAX_URL_LENGTH} characters max).`),
  )
  // "https://google.com@evil.com" opens evil.com: a classic phishing trick.
  // Zod also runs this check when z.url() has failed, hence URL.parse, which returns null
  // on an invalid URL where `new URL()` would throw.
  .refine((url) => {
    const parsed = URL.parse(url);
    return !parsed?.username && !parsed?.password;
  }, 'URLs containing credentials are not allowed.');

export const CreateLinkBodySchema = z.object({
  url: LongUrlSchema,
});

export const LinkSchema = z.object({
  code: ShortCodeSchema,
  shortUrl: z.url(),
  originalUrl: z.url(),
  createdAt: z.iso.datetime(),
});

/** What the web app sends: the URL as typed by the user, normalized by the API. */
export type CreateLinkBody = z.input<typeof CreateLinkBodySchema>;
export type Link = z.infer<typeof LinkSchema>;
