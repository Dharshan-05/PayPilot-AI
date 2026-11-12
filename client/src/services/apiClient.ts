import { ApiClientError, type ApiErrorEnvelope, type ApiSuccessEnvelope } from './types';

export interface RequestOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

const DEFAULT_TIMEOUT_MS = 12000;

export function getApiBaseUrl(): string {
  const configured =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    typeof import.meta.env.VITE_API_BASE_URL === 'string'
      ? import.meta.env.VITE_API_BASE_URL.trim().replace(/\/+$/, '')
      : '';
  return configured;
}

function mapStatusFallbackMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Invalid request parameters. Please check your input and try again.';
    case 401:
      return 'Authentication is required to perform this action.';
    case 403:
      return 'Action blocked by security policy or authorization guard.';
    case 404:
      return 'The requested resource could not be found.';
    case 409:
      return 'Conflict detected (e.g., inventory changed or price mismatch). Please refresh.';
    case 410:
      return 'This commerce proposal has expired. Please create a new one.';
    case 413:
      return 'Request payload exceeds maximum allowed size (1 MB).';
    case 429:
      return 'Too many requests. Please wait a moment before retrying.';
    case 500:
    case 502:
    case 503:
      return 'The server encountered an error while processing your request.';
    default:
      return `Request failed with status ${status}.`;
  }
}

function createCorrelationId(): string {
  return `fe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function isErrorEnvelope(val: unknown): val is ApiErrorEnvelope {
  return (
    typeof val === 'object' &&
    val !== null &&
    'error' in val &&
    typeof (val as ApiErrorEnvelope).error === 'object' &&
    (val as ApiErrorEnvelope).error !== null
  );
}

function isSuccessEnvelope<T>(val: unknown): val is ApiSuccessEnvelope<T> {
  return (
    typeof val === 'object' &&
    val !== null &&
    (val as ApiSuccessEnvelope<T>).success === true &&
    'data' in val
  );
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<{ data: T; requestId?: string }> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const correlationId = createCorrelationId();

  const controller = new AbortController();
  const timeoutHandle = window.setTimeout(() => controller.abort(), timeoutMs);

  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'x-request-id': correlationId,
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    };

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let parsed: unknown = null;
    if (rawText.length > 0) {
      try {
        parsed = JSON.parse(rawText);
      } catch {
        throw new ApiClientError({
          message: res.ok
            ? 'Received malformed response from server.'
            : mapStatusFallbackMessage(res.status),
          status: res.status || 502,
          code: 'MALFORMED_RESPONSE',
          requestId: res.headers.get('x-request-id') || correlationId,
        });
      }
    }

    if (!res.ok) {
      if (isErrorEnvelope(parsed)) {
        throw new ApiClientError({
          message: parsed.error.message || mapStatusFallbackMessage(res.status),
          status: res.status,
          code: parsed.error.code || `HTTP_${res.status}`,
          requestId: parsed.error.requestId || res.headers.get('x-request-id') || correlationId,
          details: parsed.error.details,
        });
      }
      throw new ApiClientError({
        message: mapStatusFallbackMessage(res.status),
        status: res.status,
        code: `HTTP_${res.status}`,
        requestId: res.headers.get('x-request-id') || correlationId,
      });
    }

    if (isSuccessEnvelope<T>(parsed)) {
      return {
        data: parsed.data,
        requestId: parsed.requestId || res.headers.get('x-request-id') || correlationId,
      };
    }

    throw new ApiClientError({
      message: 'Unexpected response format received from server.',
      status: 502,
      code: 'INVALID_ENVELOPE',
      requestId: res.headers.get('x-request-id') || correlationId,
    });
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      throw err;
    }

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError({
        message: 'Request timed out or was cancelled. Please try again.',
        status: 408,
        code: 'REQUEST_TIMEOUT',
        requestId: correlationId,
        isTimeout: true,
      });
    }

    throw new ApiClientError({
      message: 'Unable to reach the PayPal backend server. Verify the server is running and retry.',
      status: 0,
      code: 'NETWORK_ERROR',
      requestId: correlationId,
      isNetworkError: true,
    });
  } finally {
    window.clearTimeout(timeoutHandle);
    if (options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  del: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};
