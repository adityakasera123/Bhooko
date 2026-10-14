
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

const TOKEN_KEY = 'bhooko_delivery_access_token';
const REFRESH_TOKEN_KEY = 'bhooko_delivery_refresh_token';

const ACTIVE_STATUSES = new Set([
  'ASSIGNED',
  'RIDER_ACCEPTED',
  'ARRIVED_AT_RESTAURANT',
  'PICKED_UP',
  'OUT_FOR_DELIVERY',
]);

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

interface Delivery {
  id: string;
  status: string;
  order?: {
    id: string;
    status: string;
  };
}

interface RiderProfile {
  id: string;
  status: string;
  availability: string;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  user?: {
    name?: string;
    email?: string;
  };
}

interface ApiError extends Error {
  status?: number;
}

let refreshInFlight: Promise<string | null> | null = null;

function getApiUrl(): string {
  if (!API_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  return API_URL;
}

async function saveTokens(tokens: AuthTokens): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, tokens.accessToken);

  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(
      REFRESH_TOKEN_KEY,
      tokens.refreshToken,
    );
  }
}

async function refreshRiderAccessToken(): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${getApiUrl()}/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Keep the session on a server/network problem.
        // A rejected refresh token may require signing in again.
        return null;
      }

      const body = (await response.json()) as AuthTokens;

      if (
        typeof body.accessToken !== 'string' ||
        !body.accessToken
      ) {
        return null;
      }

      await saveTokens(body);
      return body.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function apiRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const request = async (accessToken: string) => {
    const response = await fetch(`${getApiUrl()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      const message = body?.message
        ? Array.isArray(body.message)
          ? body.message.join(', ')
          : body.message
        : `Request failed (${response.status})`;

      const error = new Error(message) as ApiError;
      error.status = response.status;
      throw error;
    }

    return body as T;
  };

  try {
    return await request(token);
  } catch (cause) {
    const error = cause as ApiError;

    if (error.status !== 401) {
      throw cause;
    }

    const refreshedToken = await refreshRiderAccessToken();

    if (!refreshedToken) {
      throw new Error(
        'Session expired. Please sign in again.',
      );
    }

    // Retry this request once with the refreshed token.
    return request(refreshedToken);
  }
}

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [gpsStatus, setGpsStatus] = useState(
    'Waiting for an active delivery',
  );
  const [lastLocation, setLastLocation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lastUploadAt = useRef(0);
  const uploading = useRef(false);

  const refreshDashboard = useCallback(async (accessToken: string) => {
    const [rider, currentDelivery] = await Promise.all([
      apiRequest<RiderProfile>('/delivery/rider/me', accessToken),
      apiRequest<Delivery | null>(
        '/delivery/rider/me/current-delivery',
        accessToken,
      ),
    ]);

    setProfile(rider);
    setDelivery(currentDelivery);
  }, []);

  const login = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`${getApiUrl()}/auth/login`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok || typeof body?.accessToken !== 'string') {
        throw new Error(
          body?.message
            ? Array.isArray(body.message)
              ? body.message.join(', ')
              : body.message
            : 'Login failed. Check your credentials and API URL.',
        );
      }

      const tokens: AuthTokens = {
        accessToken: body.accessToken,
        ...(typeof body.refreshToken === 'string'
          ? { refreshToken: body.refreshToken }
          : {}),
      };

      await saveTokens(tokens);
      await refreshDashboard(tokens.accessToken);

      setToken(tokens.accessToken);
      setPassword('');
      setNotice(
        tokens.refreshToken
          ? 'Signed in successfully. Token refresh is available.'
          : 'Signed in successfully. Login response did not include a refresh token.',
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  }, [email, password, refreshDashboard]);

  const logout = useCallback(async () => {
    setToken(null);
    setProfile(null);
    setDelivery(null);
    setLastLocation(null);
    setGpsStatus('Tracking stopped');
    setError(null);
    setNotice(null);

    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    ]);
  }, []);

  const reloadDelivery = useCallback(async () => {
    if (!token) return;

    setBusy(true);
    setError(null);

    try {
      const latestToken =
        (await SecureStore.getItemAsync(TOKEN_KEY)) ?? token;

      await refreshDashboard(latestToken);
      setNotice('Delivery information refreshed.');
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to refresh delivery.',
      );
    } finally {
      setBusy(false);
    }
  }, [token, refreshDashboard]);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        let savedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (!savedToken) {
          savedToken = await refreshRiderAccessToken();
        }

        if (!savedToken) return;

        try {
          await refreshDashboard(savedToken);
        } catch (cause) {
          const apiError = cause as ApiError;

          if (apiError.status !== 401) {
            throw cause;
          }

          const refreshedToken = await refreshRiderAccessToken();

          if (!refreshedToken) {
            throw cause;
          }

          savedToken = refreshedToken;
          await refreshDashboard(savedToken);
        }

        if (active) {
          setToken(savedToken);
        }
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to restore rider session.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [refreshDashboard]);

  useEffect(() => {
    if (!token || !delivery || !ACTIVE_STATUSES.has(delivery.status)) {
      setGpsStatus(
        delivery
          ? `Tracking is not active for ${delivery.status}`
          : 'Waiting for an active delivery',
      );
      return;
    }

    let active = true;
    let subscription: Location.LocationSubscription | undefined;

    async function startGps() {
      try {
        setGpsStatus('Requesting location permission…');

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (!permission.granted) {
          setGpsStatus('Location permission denied');
          setError('Allow location permission to share delivery progress.');
          return;
        }

        const provider = await Location.getProviderStatusAsync();

        if (!provider.locationServicesEnabled) {
          setGpsStatus('Turn on device location services');
          return;
        }

        setError(null);
        setGpsStatus('GPS active — waiting for first location');

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 0,
          },
          (position) => {
            if (!active || uploading.current || !delivery || !delivery.id || !token) {
              return;
            }

            const now = Date.now();

            // Keep the existing foreground upload interval.
            if (now - lastUploadAt.current < 4500) return;

            uploading.current = true;
            lastUploadAt.current = now;

            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracyMeters:
                position.coords.accuracy == null
                  ? undefined
                  : Math.min(
                      10000,
                      Math.max(0, position.coords.accuracy),
                    ),
              recordedAt: new Date(position.timestamp).toISOString(),
            };

            void apiRequest<{ location: { receivedAt: string } }>(
              `/delivery/${delivery.id}/location`,
              token,
              {
                method: 'POST',
                body: JSON.stringify(location),
              },
            )
              .then((result) => {
                if (!active) return;

                console.log(
                  '[GPS UPLOAD SUCCESS]',
                  result.location.receivedAt,
                );

                setLastLocation(
                  `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,
                );
                setGpsStatus('GPS active — location uploaded');
                setNotice(
                  `Last update received at ${new Date(
                    result.location.receivedAt,
                  ).toLocaleTimeString()}`,
                );
                setError(null);
              })
              .catch((cause: unknown) => {
                if (!active) return;

                console.error('[GPS UPLOAD FAILED]', cause);
                setGpsStatus('GPS active — upload failed');
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'Unable to upload GPS location.',
                );
              })
              .finally(() => {
                uploading.current = false;
              });
          },
        );
      } catch (cause) {
        if (!active) return;

        setGpsStatus('Unable to start GPS');
        setError(
          cause instanceof Error
            ? cause.message
            : 'Unable to start GPS.',
        );
      }
    }

    void startGps();

    return () => {
      active = false;
      subscription?.remove();
      uploading.current = false;
      setGpsStatus('Tracking stopped');
    };
  }, [token, delivery?.id, delivery?.status]);

  useEffect(() => {
    if (!token) return;

    const timer = setInterval(() => {
      void refreshDashboard(token).catch((cause: unknown) => {
        const apiError = cause as ApiError;

        if (apiError.status === 401) {
          setError('Session expired. Please sign in again.');
        }
      });
    }, 30000);

    return () => clearInterval(timer);
  }, [token, refreshDashboard]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#0F766E" />
        <Text style={styles.muted}>Loading BHOOKO Delivery…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>BHOOKO</Text>
            <Text style={styles.subtitle}>Delivery Partner</Text>
          </View>

          {token ? (
            <TouchableOpacity style={styles.smallButton} onPress={logout}>
              <Text style={styles.smallButtonText}>Sign out</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!token ? (
          <View style={styles.card}>
            <Text style={styles.heading}>Rider login</Text>
            <Text style={styles.muted}>
              Sign in with your existing BHOOKO delivery partner account.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="rider@example.com"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
            />

            <TouchableOpacity
              style={[styles.button, busy && styles.disabled]}
              onPress={() => void login()}
              disabled={busy || !email.trim() || !password}
            >
              <Text style={styles.buttonText}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.heading}>
                {profile?.user?.name || 'Delivery partner'}
              </Text>
              <Text style={styles.muted}>{profile?.user?.email}</Text>

              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  {profile?.status || 'Status unavailable'} ·{' '}
                  {profile?.availability || 'Availability unavailable'}
                </Text>
              </View>

              {profile?.vehicleType ? (
                <Text style={styles.bodyText}>
                  Vehicle: {profile.vehicleType}
                  {profile.vehicleNumber
                    ? ` · ${profile.vehicleNumber}`
                    : ''}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.heading}>Current delivery</Text>

              {delivery ? (
                <>
                  <Text style={styles.bodyText}>Delivery ID</Text>
                  <Text selectable style={styles.idText}>
                    {delivery.id}
                  </Text>

                  <Text style={styles.bodyText}>Status</Text>
                  <Text style={styles.status}>{delivery.status}</Text>

                  {delivery.order?.id ? (
                    <Text style={styles.muted}>
                      Order: {delivery.order.id}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.muted}>
                  No current delivery assigned.
                </Text>
              )}

              <TouchableOpacity
                style={[styles.button, busy && styles.disabled]}
                onPress={() => void reloadDelivery()}
                disabled={busy}
              >
                <Text style={styles.buttonText}>
                  {busy ? 'Refreshing…' : 'Refresh delivery'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <Text style={styles.heading}>Automatic GPS tracking</Text>
              <Text style={styles.bodyText}>{gpsStatus}</Text>
              <Text style={styles.muted}>
                Foreground updates target approximately every 5 seconds
                while an active delivery is assigned and location permission
                is granted.
              </Text>

              {lastLocation ? (
                <Text style={styles.coordinates}>
                  Last uploaded: {lastLocation}
                </Text>
              ) : null}
            </View>
          </>
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.footer}>
          Keep the app open during this foreground GPS test.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F7F6' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F7F6',
    gap: 12,
  },
  container: { padding: 20, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brand: {
    fontSize: 29,
    fontWeight: '900',
    color: '#0F766E',
    letterSpacing: 1,
  },
  subtitle: { color: '#52615F', fontSize: 14, marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E1EAE7',
  },
  heading: { fontSize: 19, fontWeight: '800', color: '#172321' },
  muted: { color: '#647370', fontSize: 13, lineHeight: 19 },
  label: { fontWeight: '700', color: '#253431', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#D5E0DD',
    backgroundColor: '#FAFCFB',
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: '#172321',
  },
  button: {
    backgroundColor: '#0F766E',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  smallButton: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#E2F2EE',
  },
  smallButtonText: { color: '#0F766E', fontWeight: '700' },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2F2EE',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: { color: '#0F766E', fontSize: 12, fontWeight: '800' },
  bodyText: { color: '#253431', fontSize: 14, lineHeight: 20 },
  idText: { color: '#647370', fontSize: 12, lineHeight: 18 },
  status: { color: '#0F766E', fontWeight: '900', fontSize: 16 },
  coordinates: { color: '#0F766E', fontSize: 12, fontWeight: '700' },
  notice: { color: '#0F766E', fontSize: 13 },
  error: {
    color: '#B42318',
    backgroundColor: '#FEECEB',
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },
  footer: { color: '#84918E', fontSize: 12, textAlign: 'center' },
});
