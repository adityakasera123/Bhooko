import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

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

export async function getDeliveryTracking(
  deliveryId: string,
): Promise<DeliveryTrackingResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      'EXPO_PUBLIC_API_URL is not configured for the customer app.',
    );
  }

  const accessToken = await AsyncStorage.getItem('bhooko.accessToken');

  if (!accessToken) {
    throw new Error('Please sign in before tracking your delivery.');
  }

  const response = await fetch(
    `${API_BASE_URL.replace(/\/$/, '')}/delivery/${encodeURIComponent(deliveryId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    if (response.status === 403 || response.status === 409) {
      throw new Error('You are not authorized to view this delivery.');
    }

    if (response.status === 404) {
      throw new Error('Delivery not found.');
    }

    throw new Error(`Unable to load delivery tracking (${response.status}).`);
  }

  return response.json() as Promise<DeliveryTrackingResponse>;
}
