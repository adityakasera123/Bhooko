
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Socket } from 'socket.io-client';

import TrackingMap, {
  type TrackingCoordinate,
} from '../../components/maps/TrackingMap';
import {
  getDeliveryTracking,
  type DeliveryTrackingResponse,
} from '../../services/api/deliveryApi';
import {
  connectToDelivery,
  type DeliveryLocationEvent,
} from '../../services/realtime/deliverySocket';

interface TrackingScreenProps {
  deliveryId: string;
}

interface DeliveryStatusEvent {
  deliveryId: string;
  event: 'delivery:statusChanged';
  status: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LOCATION_STALE_AFTER_MS = 60_000;
const TRACKING_POLL_INTERVAL_MS = 30_000;

function isLocationStale(receivedAt: string): boolean {
  const receivedAtMs = Date.parse(receivedAt);

  if (!Number.isFinite(receivedAtMs)) {
    return true;
  }

  const ageMs = Date.now() - receivedAtMs;

  // Reject future timestamps and locations older than 60 seconds.
  return ageMs < 0 || ageMs > LOCATION_STALE_AFTER_MS;
}

function formatStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TrackingScreen({
  deliveryId,
}: TrackingScreenProps) {
  const [tracking, setTracking] =
    useState<DeliveryTrackingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  useEffect(() => {
    let active = true;
    let socket: Socket | null = null;
    let pollingTimer: ReturnType<typeof setInterval> | undefined;

    async function loadTracking() {
      try {
        const result = await getDeliveryTracking(deliveryId);

        if (active) {
          setTracking(result);
          setError(null);
        }

        return result;
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : 'Unable to load delivery tracking.',
          );
        }

        return null;
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    async function startTracking() {
      const initialData = await loadTracking();

      if (!active || !initialData) {
        return;
      }

      try {
        const connectedSocket = await connectToDelivery(deliveryId);

        if (!active) {
          connectedSocket.disconnect();
          return;
        }

        socket = connectedSocket;

        const handleLocationUpdate = (
          event: DeliveryLocationEvent,
        ) => {
          if (!active || event.deliveryId !== deliveryId) {
            return;
          }

          const location = event.data?.location;

          if (
            !location ||
            !Number.isFinite(location.latitude) ||
            !Number.isFinite(location.longitude) ||
            location.latitude < -90 ||
            location.latitude > 90 ||
            location.longitude < -180 ||
            location.longitude > 180
          ) {
            return;
          }

          setTracking((current) => {
            if (!current) {
              return current;
            }

            // Do not replace a newer location with an older event.
            const currentRecordedAt = current.riderLocation
              ? Date.parse(current.riderLocation.recordedAt)
              : Number.NEGATIVE_INFINITY;
            const incomingRecordedAt = Date.parse(location.recordedAt);

            if (
              !Number.isFinite(incomingRecordedAt) ||
              incomingRecordedAt < currentRecordedAt
            ) {
              return current;
            }

            return {
              ...current,
              riderLocation: {
                ...location,
                isStale: isLocationStale(location.receivedAt),
              },
            };
          });
        };

        const handleStatusUpdate = (
          event: DeliveryStatusEvent,
        ) => {
          if (
            !active ||
            event.deliveryId !== deliveryId ||
            typeof event.status !== 'string' ||
            !event.status.trim()
          ) {
            return;
          }

          setTracking((current) => {
            if (!current) {
              return current;
            }

            return {
              ...current,
              status: event.status,
            };
          });
        };

        const handleDisconnect = () => {
          if (active) {
            setRealtimeConnected(false);
          }
        };

        const handleConnect = () => {
          if (active) {
            setRealtimeConnected(true);
            // The socket service is responsible for rejoining
            // the delivery room after reconnection.
          }
        };

        socket.on(
          'delivery:locationUpdated',
          handleLocationUpdate,
        );
        socket.on(
          'delivery:statusChanged',
          handleStatusUpdate,
        );
        socket.on('disconnect', handleDisconnect);
        socket.on('connect', handleConnect);

        setRealtimeConnected(socket.connected);
      } catch (cause) {
        if (active) {
          setRealtimeConnected(false);
          setError(
            cause instanceof Error
              ? `Live updates unavailable: ${cause.message}`
              : 'Live updates are unavailable.',
          );
        }
      }
    }

    void startTracking();

    pollingTimer = setInterval(() => {
      void loadTracking();
    }, TRACKING_POLL_INTERVAL_MS);

    return () => {
      active = false;

      if (pollingTimer) {
        clearInterval(pollingTimer);
      }

      socket?.removeAllListeners('delivery:locationUpdated');
      socket?.removeAllListeners('delivery:statusChanged');
      socket?.removeAllListeners('disconnect');
      socket?.removeAllListeners('connect');
      socket?.disconnect();
    };
  }, [deliveryId]);

  const address = tracking?.deliveryAddress;

  const hasDestination =
    typeof address?.latitude === 'number' &&
    Number.isFinite(address.latitude) &&
    address.latitude >= -90 &&
    address.latitude <= 90 &&
    typeof address?.longitude === 'number' &&
    Number.isFinite(address.longitude) &&
    address.longitude >= -180 &&
    address.longitude <= 180;

  const destination: TrackingCoordinate | null = hasDestination
    ? {
        latitude: address.latitude as number,
        longitude: address.longitude as number,
      }
    : null;

  const riderLocation = tracking?.riderLocation ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>BHOOKO DELIVERY</Text>
        <Text style={styles.title}>Track your order</Text>
        <Text style={styles.subtitle}>
          Follow your delivery and check your rider’s latest location.
        </Text>

        {loading ? (
          <View style={styles.messageCard}>
            <ActivityIndicator color="#F15A24" size="large" />
            <Text style={styles.messageText}>
              Loading delivery details…
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Tracking update</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {destination ? (
          <TrackingMap
            destination={destination}
            riderLocation={
              riderLocation
                ? {
                    latitude: riderLocation.latitude,
                    longitude: riderLocation.longitude,
                  }
                : null
            }
          />
        ) : !loading ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapIcon}>⌖</Text>
            <Text style={styles.mapTitle}>Map unavailable</Text>
            <Text style={styles.mapDescription}>
              A valid delivery destination is required to display the map.
            </Text>
          </View>
        ) : null}

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                realtimeConnected && styles.connectedDot,
              ]}
            />

            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>Live tracking</Text>
              <Text style={styles.statusDescription}>
                {realtimeConnected
                  ? 'Connected to delivery updates'
                  : 'Live connection not confirmed'}
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>
                {tracking ? formatStatus(tracking.status) : 'Pending'}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Delivery partner</Text>
            <Text style={styles.infoValue}>
              {tracking?.rider?.name ?? 'Not assigned yet'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>
              {tracking?.rider?.vehicleType ?? 'Not available'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Rider location</Text>
            <Text style={styles.infoValue}>
              {!riderLocation
                ? 'Waiting for GPS'
                : riderLocation.isStale
                  ? 'Last location is stale'
                  : 'Location available'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Destination</Text>
            <Text style={styles.infoValue}>
              {[address?.area, address?.city].filter(Boolean).join(', ') ||
                'Address unavailable'}
            </Text>
          </View>
        </View>

        <Text style={styles.note}>Delivery ID: {deliveryId}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8F2',
  },
  container: {
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    marginTop: 8,
    color: '#F15A24',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: '#211B18',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#70645E',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  mapPlaceholder: {
    height: 300,
    borderRadius: 18,
    backgroundColor: '#F0E8E1',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mapIcon: {
    color: '#F15A24',
    fontSize: 42,
    marginBottom: 8,
  },
  mapTitle: {
    color: '#211B18',
    fontSize: 17,
    fontWeight: '700',
  },
  mapDescription: {
    marginTop: 8,
    color: '#70645E',
    textAlign: 'center',
    lineHeight: 20,
  },
  messageCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  messageText: {
    color: '#70645E',
  },
  errorCard: {
    padding: 14,
    backgroundColor: '#FDEBE7',
    borderRadius: 12,
    gap: 6,
  },
  errorTitle: {
    color: '#9E2D18',
    fontWeight: '700',
  },
  errorText: {
    color: '#7C3528',
    lineHeight: 20,
  },
  statusCard: {
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F0E3DA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D99A36',
  },
  connectedDot: {
    backgroundColor: '#27945B',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: '#211B18',
    fontSize: 15,
    fontWeight: '700',
  },
  statusDescription: {
    color: '#70645E',
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    maxWidth: 130,
    backgroundColor: '#FFF0D7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#875C12',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E3DA',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  infoLabel: {
    color: '#70645E',
    fontSize: 13,
  },
  infoValue: {
    color: '#211B18',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  note: {
    color: '#8A7D75',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
});
