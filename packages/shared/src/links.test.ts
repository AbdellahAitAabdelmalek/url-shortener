import { describe, expect, it } from 'vitest';
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  CreateLinkBodySchema,
  LinkSchema,
  LongUrlSchema,
  MAX_URL_LENGTH,
  ShortCodeSchema,
} from './links';

const tooLongUrl = `https://stoik.com/${'a'.repeat(MAX_URL_LENGTH)}`;
// 718 characters as typed, but each "é" becomes "%C3%A9" once normalized: 4218 characters.
const tooLongOnceEncodedUrl = `https://stoik.com/${'é'.repeat(700)}`;

describe('LongUrlSchema', () => {
  it.each([
    [
      'an https URL',
      'https://www.stoik.com/barometre-ifop-2025-eti-risque-cyber',
      'https://www.stoik.com/barometre-ifop-2025-eti-risque-cyber',
    ],
    ['an http URL', 'http://stoik.com/', 'http://stoik.com/'],
    [
      'a query string and a fragment',
      'https://stoik.com/search?q=cyber&page=2#results',
      'https://stoik.com/search?q=cyber&page=2#results',
    ],
    ['a port', 'https://stoik.com:8443/path', 'https://stoik.com:8443/path'],
    ['a bare domain, prefixed with https://', 'stoik.com', 'https://stoik.com/'],
    [
      'a domain and a path, prefixed with https://',
      'www.stoik.com/blog',
      'https://www.stoik.com/blog',
    ],
    ['surrounding whitespace, trimmed', '  https://stoik.com/  ', 'https://stoik.com/'],
  ])('accepts %s', (_, input, expected) => {
    expect(LongUrlSchema.parse(input)).toBe(expected);
  });

  it.each([
    ['adds the root path', 'https://stoik.com', 'https://stoik.com/'],
    [
      'lowercases the scheme and the host',
      'HTTPS://WWW.Stoik.COM/Path',
      'https://www.stoik.com/Path',
    ],
    ['removes the default port', 'https://stoik.com:443/', 'https://stoik.com/'],
    ['percent-encodes the path', 'https://stoik.com/café', 'https://stoik.com/caf%C3%A9'],
    ['converts the host to punycode', 'https://bücher.de/', 'https://xn--bcher-kva.de/'],
  ])('normalizes the URL: %s', (_, input, expected) => {
    expect(LongUrlSchema.parse(input)).toBe(expected);
  });

  it('is idempotent, since both the web app and the API parse the same input', () => {
    const once = LongUrlSchema.parse('HTTPS://Stoik.com/café?q=1');

    expect(LongUrlSchema.parse(once)).toBe(once);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a word that is not a domain', 'hello'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['a javascript:// URL', 'javascript://%0Aalert(1)'],
    ['a data: URL', 'data:text/html,<script>alert(1)</script>'],
    ['a file: URL', 'file:///etc/passwd'],
    ['an ftp: URL', 'ftp://stoik.com/file'],
    ['localhost', 'http://localhost:3000'],
    ['an IPv4 address', 'http://127.0.0.1/admin'],
    ['the cloud metadata IP', 'http://169.254.169.254/latest/meta-data'],
    ['an IPv6 address', 'http://[::1]/'],
    ['credentials hiding the real host', 'https://google.com@evil.com'],
    ['a username and a password', 'https://user:pass@stoik.com'],
    ['a URL that is too long', tooLongUrl],
    ['a URL that is too long once normalized', tooLongOnceEncodedUrl],
  ])('rejects %s', (_, input) => {
    expect(LongUrlSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ['an empty string', '', 'Please enter a URL.'],
    ['an invalid URL', 'hello', 'Please enter a valid URL, like https://example.com.'],
    ['credentials', 'https://google.com@evil.com', 'URLs containing credentials are not allowed.'],
    ['a URL that is too long', tooLongUrl, 'This URL is too long (2048 characters max).'],
  ])('explains the rejection of %s with a single message', (_, input, message) => {
    const result = LongUrlSchema.safeParse(input);

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([message]);
  });
});

describe('ShortCodeSchema', () => {
  const validCode = CODE_ALPHABET.slice(0, CODE_LENGTH);

  it('accepts a code made of the alphabet with the expected length', () => {
    expect(ShortCodeSchema.parse(validCode)).toBe(validCode);
  });

  it.each([
    ['too short', validCode.slice(1)],
    ['too long', `${validCode}a`],
    ['containing a character outside the alphabet', `${validCode.slice(1)}-`],
    ['containing a path', `${validCode.slice(2)}/x`],
  ])('rejects a code %s', (_, code) => {
    expect(ShortCodeSchema.safeParse(code).success).toBe(false);
  });

  it('excludes characters that are easy to confuse when reading a link', () => {
    expect(CODE_ALPHABET).not.toMatch(/[0O1lI]/);
  });
});

describe('CreateLinkBodySchema', () => {
  it('normalizes the URL', () => {
    expect(CreateLinkBodySchema.parse({ url: 'stoik.com' })).toEqual({ url: 'https://stoik.com/' });
  });

  it('rejects a body without URL', () => {
    expect(CreateLinkBodySchema.safeParse({}).success).toBe(false);
  });
});

describe('LinkSchema', () => {
  const link = {
    code: CODE_ALPHABET.slice(0, CODE_LENGTH),
    shortUrl: 'http://localhost:4000/2345678',
    originalUrl: 'https://stoik.com',
    createdAt: '2026-10-06T12:00:00.000Z',
  };

  it('accepts a link', () => {
    expect(LinkSchema.parse(link)).toEqual(link);
  });

  it('requires createdAt to be an ISO 8601 string, as JSON has no date type', () => {
    expect(LinkSchema.safeParse({ ...link, createdAt: new Date() }).success).toBe(false);
    expect(LinkSchema.safeParse({ ...link, createdAt: '06/10/2026' }).success).toBe(false);
  });
});
