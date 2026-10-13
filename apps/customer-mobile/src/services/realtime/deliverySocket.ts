import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, type Socket } from 'socket.io-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface TrackingCoordinate {
  latitude: number;
  longitude: number;
}

export interface DeliveryLocationEvent {
  deliveryId: string;
  event: 'delivery:locationUpdated';
  timestamp: string;
  data: {
    location: TrackingCoordinate & {
      accuracyMeters: number | null;
      recordedAt: string;
      receivedAt: string;
    };
  };
}

interface JoinDeliveryResponse {
  event: 'joinDelivery:success' | 'joinDelivery:error';
  data: {
    deliveryId?: string;
    room?: string;
    message?: string;
  };
}

export async function connectToDelivery(
  deliveryId: string,
): Promise<Socket> {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  if (!deliveryId?.trim()) {
    throw new Error('A valid delivery ID is required.');
  }

  const accessToken = await AsyncStorage.getItem('bhooko.accessToken');

  if (!accessToken) {
    throw new Error('Please sign in before tracking your delivery.');
  }

  const socket = io(
    `${API_BASE_URL.replace(/\/$/, '')}/delivery`,
    {
      auth: { token: accessToken },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
    },
  );

  let initialJoinCompleted = false;

  return new Promise<Socket>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (!initialJoinCompleted) {
        socket.disconnect();
        reject(
          new Error('Timed out connecting to delivery tracking.'),
        );
      }
    }, 10_000);

    const cleanupInitialListeners = () => {
      clearTimeout(timeout);
      socket.off('connect_error', onInitialConnectionError);
    };

    const onInitialConnectionError = (error: Error) => {
      if (initialJoinCompleted) {
        return;
      }

      cleanupInitialListeners();
      socket.disconnect();

      reject(
        new Error(error.message || 'Socket connection failed.'),
      );
    };

    socket.on('connect_error', onInitialConnectionError);

    // Join the delivery room after every connection/reconnection.
   const onJoinSuccess = (data: {
  deliveryId: string;
  room: string;
}) => {
  console.log('[DeliverySocket] join success event:', data);

  if (!initialJoinCompleted) {
    initialJoinCompleted = true;
    cleanupInitialListeners();
    resolve(socket);
  }
};

const onJoinError = (data: { message?: string }) => {
  console.error('[DeliverySocket] join error event:', data);

  if (!initialJoinCompleted) {
    cleanupInitialListeners();
    socket.disconnect();

    reject(
      new Error(data?.message ?? 'Unable to join delivery tracking.'),
    );
  }
};

socket.on('joinDelivery:success', onJoinSuccess);
socket.on('joinDelivery:error', onJoinError);

socket.on('connect', () => {
  console.log('[DeliverySocket] emitting joinDelivery:', {
    deliveryId,
    type: typeof deliveryId,
  });

  socket.emit('joinDelivery', { deliveryId });
});

    socket.connect();
  });
}
