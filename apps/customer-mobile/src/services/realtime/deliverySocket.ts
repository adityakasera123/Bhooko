
import { io, type Socket } from 'socket.io-client';

import {
  getAccessToken,
  refreshAccessToken,
} from '../auth/authService';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const CONNECTION_TIMEOUT_MS = 10_000;

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

interface JoinDeliverySuccess {
  deliveryId: string;
  room: string;
}

interface JoinDeliveryError {
  message?: string;
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

  const socket: Socket = io(
    `${API_BASE_URL.replace(/\/$/, '')}/delivery`,
    {
      auth: { token: accessToken },
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
    },
  );

  let initialJoinCompleted = false;
  let refreshInProgress = false;
  let refreshAttempted = false;
  let settled = false;

  return new Promise<Socket>((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;

    const cleanupTimeout = () => {
      clearTimeout(timeout);
    };

    const failInitialConnection = (message: string) => {
      if (settled || initialJoinCompleted) {
        return;
      }

      settled = true;
      cleanupTimeout();
      socket.disconnect();

      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('joinDelivery:success', handleJoinSuccess);
      socket.off('joinDelivery:error', handleJoinError);

      reject(new Error(message));
    };

    const handleConnect = () => {
      // A connection succeeded. Allow a fresh refresh attempt if a
      // later reconnection fails because the access token has expired.
      refreshAttempted = false;

      // The backend requires room authorization after every connection.
      socket.emit('joinDelivery', { deliveryId });
    };

    const handleConnectError = async (error: Error) => {
      if (refreshInProgress || refreshAttempted) {
        if (!initialJoinCompleted) {
          failInitialConnection(
            error.message || 'Socket connection failed.',
          );
        }

        // After the first successful join, Socket.IO can continue
        // reconnecting. A new connection can trigger another refresh.
        return;
      }

      refreshAttempted = true;
      refreshInProgress = true;

      try {
        const refreshedToken = await refreshAccessToken();

        if (!refreshedToken) {
          if (!initialJoinCompleted) {
            failInitialConnection(
              'Your session has expired. Please sign in again.',
            );
          }

          return;
        }

        accessToken = refreshedToken;
        socket.auth = { token: accessToken };

        // Retry using the refreshed access token.
        socket.connect();
      } catch {
        if (!initialJoinCompleted) {
          failInitialConnection(
            'Unable to refresh your session. Please sign in again.',
          );
        }
      } finally {
        refreshInProgress = false;
      }
    };

    const handleJoinSuccess = (data: JoinDeliverySuccess) => {
      if (data?.deliveryId !== deliveryId) {
        return;
      }

      if (!initialJoinCompleted) {
        initialJoinCompleted = true;
        settled = true;
        cleanupTimeout();
        resolve(socket);
      }
    };

    const handleJoinError = (data: JoinDeliveryError) => {
      const message =
        data?.message ?? 'Unable to join delivery tracking.';

      if (!initialJoinCompleted) {
        failInitialConnection(message);
      }

      // Do not silently claim that the room was joined successfully.
      // Consumers can listen for this event if a later rejoin fails.
    };

    timeout = setTimeout(() => {
      failInitialConnection(
        'Timed out connecting to delivery tracking.',
      );
    }, CONNECTION_TIMEOUT_MS);

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('joinDelivery:success', handleJoinSuccess);
    socket.on('joinDelivery:error', handleJoinError);

    socket.connect();
  });
}
