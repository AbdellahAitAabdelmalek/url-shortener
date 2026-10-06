import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'INVALID_TARGET',
  'NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL',
]);

/**
 * The single error format of the API. Every error, including the ones raised by Fastify
 * and its plugins, is mapped to it so that the web app can always parse it.
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
  }),
});

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
