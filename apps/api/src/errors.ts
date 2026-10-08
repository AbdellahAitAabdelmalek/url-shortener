import type { ApiError, ApiErrorCode } from '@url-shortener/shared';
import type { FastifyError, FastifyInstance } from 'fastify';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';

/** An expected business error: sent to the client with its code and message. */
export class DomainError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_TARGET: 400,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

function apiError(code: ApiErrorCode, message: string): ApiError {
  return { error: { code, message } };
}

/** Maps every error to the ApiError format, so that the web app can always parse it. */
export function registerErrorHandlers(app: FastifyInstance) {
  // Errors raised by Fastify and its plugins are FastifyErrors (with an optional statusCode).
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      // One message is enough: the form has a single field.
      const message = error.validation[0]?.message ?? 'Invalid request.';
      return reply
        .code(STATUS_BY_CODE.VALIDATION_ERROR)
        .send(apiError('VALIDATION_ERROR', message));
    }

    if (error instanceof DomainError) {
      return reply.code(STATUS_BY_CODE[error.code]).send(apiError(error.code, error.message));
    }

    // Other client errors raised by Fastify: malformed JSON, unsupported content type...
    if (error.statusCode !== undefined && error.statusCode < 500) {
      return reply.code(error.statusCode).send(apiError('VALIDATION_ERROR', error.message));
    }

    // Unexpected: log the details, never send them to the client.
    request.log.error({ err: error }, 'Unexpected error');
    return reply
      .code(STATUS_BY_CODE.INTERNAL)
      .send(apiError('INTERNAL', 'Something went wrong. Please try again.'));
  });

  app.setNotFoundHandler((request, reply) => {
    return reply
      .code(STATUS_BY_CODE.NOT_FOUND)
      .send(apiError('NOT_FOUND', `Route ${request.method} ${request.url} not found.`));
  });
}
