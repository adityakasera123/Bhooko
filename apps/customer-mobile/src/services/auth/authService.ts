import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const ACCESS_TOKEN_KEY = 'bhooko.accessToken';
const REFRESH_TOKEN_KEY = 'bhooko.refreshToken';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginResponse extends AuthTokens {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
}

let refreshInFlight: Promise<string | null> | null = null;

function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  return API_BASE_URL.replace(/\/$/, '');
}

export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function saveAuthTokens(tokens: AuthTokens): Promise<void> {
  if (!tokens.accessToken || !tokens.refreshToken) {
    throw new Error('Both access and refresh tokens are required.');
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export async function loginCustomer(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const result = (await response.json()) as LoginResponse & {
    message?: string | string[];
  };

  if (!response.ok) {
    const message = Array.isArray(result.message)
      ? result.message.join(', ')
      : result.message;

    throw new Error(message || `Login failed (${response.status}).`);
  }

  await saveAuthTokens(result);

  return result;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      await clearAuthTokens();
      return null;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearAuthTokens();
        return null;
      }

      const tokens = (await response.json()) as AuthTokens;

      if (!tokens.accessToken || !tokens.refreshToken) {
        await clearAuthTokens();
        return null;
      }

      await saveAuthTokens(tokens);
      return tokens.accessToken;
    } catch {
      // A network failure is not proof that the refresh token is invalid.
      // Keep the session so a later request can retry.
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return null;
  }

  // The caller will refresh after an API 401. Avoid refreshing proactively
  // because this service does not decode JWT expiry or rely on device time.
  return accessToken;
}

export async function logoutCustomer(): Promise<void> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  try {
    if (refreshToken) {
      await fetch(`${getApiBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    await clearAuthTokens();
  }
}
