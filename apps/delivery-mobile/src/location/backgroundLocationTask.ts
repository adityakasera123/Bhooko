import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

export const TASK_NAME = 'BHOOKO_RIDER_BACKGROUND_LOCATION';
export const DELIVERY_ID_KEY = 'bhooko_delivery_active_id';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

const TOKEN_KEY = 'bhooko_delivery_access_token';
const REFRESH_TOKEN_KEY = 'bhooko_delivery_refresh_token';

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

  if (!refreshToken || !API_URL) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const body = await response.json().catch(() => null);

    if (!response.ok || typeof body?.accessToken !== 'string') {
      return null;
    }

    await SecureStore.setItemAsync(TOKEN_KEY, body.accessToken);

    if (typeof body.refreshToken === 'string') {
      await SecureStore.setItemAsync(
        REFRESH_TOKEN_KEY,
        body.refreshToken,
      );
    }

    return body.accessToken;
  } catch (cause) {
    console.error('[BACKGROUND GPS] Token refresh failed:', cause);
    return null;
  }
}

async function uploadLocation(
  deliveryId: string,
  accessToken: string,
  location: Location.LocationObject,
): Promise<Response> {
  return fetch(`${API_URL}/delivery/${deliveryId}/location`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      recordedAt: new Date(location.timestamp).toISOString(),
    }),
  });
}

TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
  console.log('[BACKGROUND GPS] JS HANDLER ENTERED');
  if (error) {
    console.error('[BACKGROUND GPS TASK ERROR]', error.message);
    return;
  }

  if (!data || !API_URL) {
  console.warn('[BACKGROUND GPS] Missing data or API_URL', {
    hasData: Boolean(data),
    hasApiUrl: Boolean(API_URL),
  });
  return;
}

  try {
    const locations = (
      data as { locations?: Location.LocationObject[] }
    ).locations;

   if (!locations?.length) {
  console.warn('[BACKGROUND GPS] No location objects received');
  return;
}

    const latest = locations[locations.length - 1];

    const [deliveryId, accessToken] = await Promise.all([
      SecureStore.getItemAsync(DELIVERY_ID_KEY),
      SecureStore.getItemAsync(TOKEN_KEY),
    ]);
    
if (!deliveryId || !accessToken) {
  console.warn('[BACKGROUND GPS] Missing stored session values', {
    hasDeliveryId: Boolean(deliveryId),
    hasAccessToken: Boolean(accessToken),
  });
  return;
}
    

    let response = await uploadLocation(
      deliveryId,
      accessToken,
      latest,
    );

    if (response.status === 401) {
      const refreshedToken = await refreshAccessToken();

      if (!refreshedToken) {
        console.warn('[BACKGROUND GPS] Session expired; sign-in required.');
        return;
      }

      response = await uploadLocation(
        deliveryId,
        refreshedToken,
        latest,
      );
    }

    if (!response.ok) {
      console.warn('[BACKGROUND GPS] Upload failed:', response.status);
      return;
    }

    console.log('[BACKGROUND GPS] Location uploaded');
  } catch (cause) {
    console.error('[BACKGROUND GPS] Upload error:', cause);
  }
});
