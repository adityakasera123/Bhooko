import {
  getAccessToken,
  refreshAccessToken,
  hasRefreshToken,
} from '../auth/authService';

import {
  ApiError,
  type ApiErrorResponse,
} from './apiError';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface ApiRequestOptions extends RequestInit {
  auth?: boolean;
}

let refreshInFlight: Promise<string | null> | null = null;

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  return API_BASE_URL.replace(/\/$/, '');
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function refreshSession(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken();
  }

  const currentRefresh = refreshInFlight;

  try {
    return await currentRefresh;
  } finally {
    if (refreshInFlight === currentRefresh) {
      refreshInFlight = null;
    }
  }
}

async function getRefreshFailureError(): Promise<ApiError> {
  const refreshTokenExists = await hasRefreshToken();

  if (refreshTokenExists) {
    return new ApiError(
      'Unable to verify your session. Please check your internet connection and retry.',
      0,
      { code: 'TOKEN_REFRESH_UNAVAILABLE' },
    );
  }

  return new ApiError(
    'Your session has expired. Please sign in again.',
    401,
    { code: 'SESSION_EXPIRED' },
  );
}

async function performFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch (error) {
    throw new ApiError(
      'Unable to connect to the server. Please check your internet connection.',
      0,
      {
        code: 'NETWORK_ERROR',
        details: error,
      },
    );
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      'The server returned an invalid response.',
      response.status,
      {
        code: 'INVALID_RESPONSE',
        details: text,
      },
    );
  }
}

async function createApiError(response: Response): Promise<ApiError> {
  let result: ApiErrorResponse | undefined;

  try {
    result = await response.json() as ApiErrorResponse;
  } catch {
    // The server may return an empty or non-JSON error response.
  }

  const message = Array.isArray(result?.message)
    ? result.message.join(', ')
    : result?.message;

  return new ApiError(
    message || `Request failed (${response.status}).`,
    response.status,
    {
      code: result?.error,
      details: result,
    },
  );
}

function createHeaders(
  headers?: HeadersInit,
  accessToken?: string | null,
): Headers {
  const result = new Headers(headers);

  result.set('Accept', 'application/json');

  if (accessToken) {
    result.set('Authorization', `Bearer ${accessToken}`);
  } else {
    result.delete('Authorization');
  }

  return result;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    headers: requestHeaders,
    ...requestOptions
  } = options;

  const url = buildUrl(path);

  let accessToken: string | null = null;

  if (auth) {
    accessToken = await getAccessToken();

    if (!accessToken) {
      accessToken = await refreshSession();

      if (!accessToken) {
        const refreshError = await getRefreshFailureError();

        if (refreshError.status === 401) {
          throw new ApiError(
            'Please sign in to continue.',
            401,
            { code: 'UNAUTHENTICATED' },
          );
        }

        throw refreshError;
      }
    }
  }

  const sendRequest = (token: string | null) =>
    performFetch(url, {
      ...requestOptions,
      headers: createHeaders(requestHeaders, token),
    });

  let response = await sendRequest(accessToken);

  // Refresh once after an expired access token.
  if (auth && response.status === 401) {
    accessToken = await refreshSession();

    if (!accessToken) {
      throw await getRefreshFailureError();
    }

    // Retry the original request only once.
    response = await sendRequest(accessToken);
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  return readResponse<T>(response);
}
