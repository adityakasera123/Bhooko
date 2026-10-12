import AsyncStorage from '@react-native-async-storage/async-storage';
import { io, type Socket } from 'socket.io-client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export interface DeliveryLocationEvent {
  deliveryId: string;
  event: 'delivery:locationUpdated';
  timestamp: string;
  data: {
    location: {
      latitude: number;
      longitude: number;
      accuracyMeters: number | null;
      recordedAt: string;
      receivedAt: string;
    };
  };
}

export async function connectToDelivery(
  deliveryId: string,
): Promise<Socket> {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  const accessToken = await AsyncStorage.getItem('bhooko.accessToken');

  if (!accessToken) {
    throw new Error('Please sign in before tracking your delivery.');
  }

  const socket = io(`${API_BASE_URL.replace(/\/$/, '')}/delivery`, {
    auth: { token: accessToken },
    transports: ['websocket'],
    autoConnect: false,
    reconnection: true,
  });

  socket.connect();

  socket.once('connect', () => {
    socket.emit('joinDelivery', { deliveryId }, (response: unknown) => {
      // Join errors are surfaced through the screen's error handling
      // once the server acknowledgement contract is integrated.
      if (__DEV__) {
        console.log('Delivery room join acknowledgement received.');
      }
    });
  });

  return socket;
}
