import { apiRequest } from './apiClient';

export type RestaurantStatus = 'OPEN' | 'CLOSED' | 'PAUSED';

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  addressLine1: string;
  addressLine2: string | null;
  area: string;
  city: string;
  state: string;
  pincode: string;
  status: RestaurantStatus;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export async function getRestaurants(): Promise<Restaurant[]> {
  return apiRequest<Restaurant[]>('/restaurants', {
    method: 'GET',
    auth: false,
  });
}

export async function getRestaurantById(
  restaurantId: string,
): Promise<Restaurant> {
  if (!restaurantId?.trim()) {
    throw new Error('A valid restaurant ID is required.');
  }

  return apiRequest<Restaurant>(
    `/restaurants/${encodeURIComponent(restaurantId)}`,
    {
      method: 'GET',
      auth: false,
    },
  );
}
