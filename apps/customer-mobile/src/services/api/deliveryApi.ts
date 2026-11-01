import { apiRequest } from './apiClient';

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;
}

export interface DeliveryTrackingResponse {
  deliveryId: string;
  orderId: string;
  status: string;
  riderLocation: (TrackingCoordinate & {
    accuracyMeters: number | null;
    recordedAt: string;
    receivedAt: string;
    isStale: boolean;
  }) | null;
  rider: {
    id: string;
    name: string | null;
    phone: string | null;
    vehicleType: string | null;
    vehicleNumber: string | null;
  } | null;
  deliveryAddress: {
    label: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    area: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    latitude: number | null;
    longitude: number | null;
    instructions: string | null;
  };
}

export interface DeliveryRouteResponse {
  available: boolean;
  reason: string | null;
  route: {
    distanceMeters: number;
    distanceKm: number;
    durationSeconds: number;
    durationMinutes: number;
    encodedPolyline: string;
    calculatedAt: string;
  } | null;
}

function getDeliveryPath(deliveryId: string): string {
  if (!deliveryId?.trim()) {
    throw new Error('A valid delivery ID is required.');
  }

  return `/delivery/${encodeURIComponent(deliveryId)}`;
}

function handleDeliveryError(error: unknown, resource: 'tracking' | 'route'): never {
  if (error instanceof Error && 'status' in error) {
    const status = (error as Error & { status: number }).status;

    if (status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    if (status === 403 || status === 409) {
      throw new Error(
        resource === 'tracking'
          ? 'You are not authorized to view this delivery.'
          : 'You are not authorized to view this delivery route.',
      );
    }

    if (status === 404) {
      throw new Error(
        resource === 'tracking'
          ? 'Delivery not found.'
          : 'Delivery route not found.',
      );
    }

    throw new Error(
      resource === 'tracking'
        ? `Unable to load delivery tracking (${status}).`
        : `Unable to load delivery route (${status}).`,
    );
  }

  throw error instanceof Error
    ? error
    : new Error(
        resource === 'tracking'
          ? 'Unable to load delivery tracking.'
          : 'Unable to load delivery route.',
      );
}

export async function getDeliveryTracking(
  deliveryId: string,
): Promise<DeliveryTrackingResponse> {
  const path = getDeliveryPath(deliveryId);

  try {
    return await apiRequest<DeliveryTrackingResponse>(path, {
      method: 'GET',
    });
  } catch (error) {
    return handleDeliveryError(error, 'tracking');
  }
}

export async function getDeliveryRoute(
  deliveryId: string,
): Promise<DeliveryRouteResponse> {
  const path = `${getDeliveryPath(deliveryId)}/route`;

  try {
    return await apiRequest<DeliveryRouteResponse>(path, {
      method: 'GET',
    });
  } catch (error) {
    return handleDeliveryError(error, 'route');
  }
}
