
import { io, type Socket } from 'socket.io-client';

import {
  getAccessToken,
  refreshAccessToken,
} from '../auth/authService';

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

  let accessToken = await getAccessToken();

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
  let refreshAttempted = false;

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

    const onInitialConnectionError = async (error: Error) => {
      if (initialJoinCompleted) {
        return;
      }

      // Try refreshing an expired access token only once.
      if (!refreshAttempted) {
        refreshAttempted = true;

        const refreshedToken = await refreshAccessToken();

        if (refreshedToken) {
          accessToken = refreshedToken;
          socket.auth = { token: refreshedToken };

          // Retry the connection using the refreshed token.
          socket.connect();
          return;
        }
      }

      cleanupInitialListeners();
      socket.disconnect();

      reject(
        new Error(error.message || 'Socket connection failed.'),
      );
    };

    const onJoinSuccess = (data: {
      deliveryId: string;
      room: string;
    }) => {
      if (!initialJoinCompleted) {
        initialJoinCompleted = true;
        cleanupInitialListeners();
        resolve(socket);
      }
    };

    const onJoinError = async (data: { message?: string }) => {
      if (initialJoinCompleted) {
        return;
      }

      cleanupInitialListeners();
      socket.disconnect();

      reject(
        new Error(
          data?.message ?? 'Unable to join delivery tracking.',
        ),
      );
    };

    socket.on('connect_error', onInitialConnectionError);
    socket.on('joinDelivery:success', onJoinSuccess);
    socket.on('joinDelivery:error', onJoinError);

    // Rejoin the delivery room on every connection/reconnection.
    socket.on('connect', () => {
      socket.emit('joinDelivery', { deliveryId });
    });

    socket.connect();
  });
}
