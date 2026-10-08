import {
  type ApiErrorCode,
  ApiErrorSchema,
  type CreateLinkBody,
  type Link,
  LinkSchema,
} from '@url-shortener/shared';

export interface CreateLinkResult {
  link: Link;
  /** false when the URL had already been shortened: the API returns its existing link. */
  created: boolean;
}

/** Every failure of the client, with a message that can be shown as is to the user. */
export class ApiClientError extends Error {
  readonly code: ApiErrorCode | 'NETWORK_ERROR' | 'UNEXPECTED_RESPONSE';

  constructor(code: ApiClientError['code'], message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

export async function createLink(body: CreateLinkBody): Promise<CreateLinkResult> {
  let response: Response;
  try {
    response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiClientError(
      'NETWORK_ERROR',
      'Cannot reach the server. Check your connection and try again.',
    );
  }

  // Responses are validated, not trusted: types alone vanish at runtime.
  const json: unknown = await response.json().catch(() => undefined);
  if (response.ok) {
    const link = LinkSchema.safeParse(json);
    if (link.success) return { link: link.data, created: response.status === 201 };
  } else {
    const apiError = ApiErrorSchema.safeParse(json);
    if (apiError.success) {
      throw new ApiClientError(apiError.data.error.code, apiError.data.error.message);
    }
  }

  // A response outside the contract: a proxy error page, an API version mismatch...
  throw new ApiClientError('UNEXPECTED_RESPONSE', 'Something went wrong. Please try again.');
}
