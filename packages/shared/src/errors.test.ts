import { describe, expect, it } from 'vitest';
import { ApiErrorSchema } from './errors';

describe('ApiErrorSchema', () => {
  it('accepts a known error code with a message', () => {
    const body = { error: { code: 'NOT_FOUND', message: 'This link does not exist.' } };

    expect(ApiErrorSchema.parse(body)).toEqual(body);
  });

  it('rejects an unknown error code', () => {
    const body = { error: { code: 'TEAPOT', message: "I'm a teapot." } };

    expect(ApiErrorSchema.safeParse(body).success).toBe(false);
  });

  it("rejects Fastify's default error format, which every error must be mapped from", () => {
    const fastifyDefault = { statusCode: 404, error: 'Not Found', message: 'Route not found' };

    expect(ApiErrorSchema.safeParse(fastifyDefault).success).toBe(false);
  });
});
