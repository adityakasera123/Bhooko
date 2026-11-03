import { apiRequest } from './apiClient';

export type FoodType = 'VEG' | 'NON_VEG' | 'EGG';

export interface FoodCategory {
  id: string;
  restaurantId: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodCategorySummary {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface FoodItem {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceInPaise: number;
  isAvailable: boolean;
  foodType: FoodType;
  createdAt: string;
  updatedAt: string;
  category: FoodCategorySummary | null;
}

function validateRestaurantId(restaurantId: string): string {
  if (!restaurantId?.trim()) {
    throw new Error('A valid restaurant ID is required.');
  }

  return encodeURIComponent(restaurantId);
}

export async function getRestaurantCategories(
  restaurantId: string,
): Promise<FoodCategory[]> {
  const id = validateRestaurantId(restaurantId);

  return apiRequest<FoodCategory[]>(
    `/restaurants/${id}/categories`,
    {
      method: 'GET',
      auth: false,
    },
  );
}

export async function getRestaurantFoodItems(
  restaurantId: string,
): Promise<FoodItem[]> {
  const id = validateRestaurantId(restaurantId);

  return apiRequest<FoodItem[]>(
    `/restaurants/${id}/food-items`,
    {
      method: 'GET',
      auth: false,
    },
  );
}
