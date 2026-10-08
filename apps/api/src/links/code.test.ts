import { ShortCodeSchema } from '@url-shortener/shared';
import { describe, expect, it } from 'vitest';
import { generateCode } from './code';

describe('generateCode', () => {
  const codes = Array.from({ length: 1_000 }, () => generateCode());

  it('generates codes that match the short code format', () => {
    for (const code of codes) {
      expect(ShortCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('generates different codes', () => {
    expect(new Set(codes).size).toBe(codes.length);
  });
});
