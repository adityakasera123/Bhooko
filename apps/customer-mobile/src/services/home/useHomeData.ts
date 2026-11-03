import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getRestaurants,
  type Restaurant,
} from '../api/restaurantsApi';

import {
  getRestaurantCategories,
  getRestaurantFoodItems,
  type FoodCategory,
  type FoodItem,
} from '../api/foodApi';

export interface HomeCategory {
  id: string;
  name: string;
  displayOrder: number;
  restaurantIds: string[];
}

export interface HomeFoodItem extends FoodItem {
  restaurantName: string;
}

interface HomeData {
  restaurants: Restaurant[];
  categories: HomeCategory[];
  foodItems: HomeFoodItem[];
}

interface HomeDataState extends HomeData {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const initialState: HomeDataState = {
  restaurants: [],
  categories: [],
  foodItems: [],
  loading: true,
  refreshing: false,
  error: null,
};

function buildHomeCategories(
  categories: Array<FoodCategory & { restaurantId: string }>,
): HomeCategory[] {
  const categoryMap = new Map<string, HomeCategory>();

  categories.forEach((category) => {
    const normalizedName = category.name.trim().toLowerCase();

    if (!normalizedName) {
      return;
    }

    const existing = categoryMap.get(normalizedName);

    if (existing) {
      if (!existing.restaurantIds.includes(category.restaurantId)) {
        existing.restaurantIds.push(category.restaurantId);
      }

      existing.displayOrder = Math.min(
        existing.displayOrder,
        category.displayOrder,
      );

      return;
    }

    categoryMap.set(normalizedName, {
      id: normalizedName,
      name: category.name.trim(),
      displayOrder: category.displayOrder,
      restaurantIds: [category.restaurantId],
    });
  });

  return Array.from(categoryMap.values()).sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

export default function useHomeData() {
  const [state, setState] = useState<HomeDataState>(initialState);
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const loadHomeData = useCallback(async (isRefresh = false) => {
    const requestId = ++requestIdRef.current;

    if (isRefresh && hasLoadedRef.current) {
      setState((previous) => ({
        ...previous,
        refreshing: true,
        error: null,
      }));
    } else {
      setState((previous) => ({
        ...previous,
        loading: true,
        error: null,
      }));
    }

    try {
      const restaurantResponse = await getRestaurants();

      // Closed restaurants should not appear in the customer discovery feed.
      const availableRestaurants = restaurantResponse.filter(
        (restaurant) => restaurant.status !== 'CLOSED',
      );

      const restaurantDetails = await Promise.all(
        availableRestaurants.map(async (restaurant) => {
          const [categoriesResult, foodResult] = await Promise.allSettled([
            getRestaurantCategories(restaurant.id),
            getRestaurantFoodItems(restaurant.id),
          ]);

          return {
            restaurant,
            categories:
              categoriesResult.status === 'fulfilled'
                ? categoriesResult.value
                : [],
            foodItems:
              foodResult.status === 'fulfilled'
                ? foodResult.value
                : [],
          };
        }),
      );

      if (requestId !== requestIdRef.current) {
        return;
      }

      const activeCategories: Array<
        FoodCategory & { restaurantId: string }
      > = [];

      const availableFoodItems: HomeFoodItem[] = [];

      restaurantDetails.forEach((details) => {
        details.categories.forEach((category) => {
          if (category.isActive) {
            activeCategories.push(category);
          }
        });

        details.foodItems.forEach((item) => {
          if (!item.isAvailable) {
            return;
          }

          // Do not show food belonging to an inactive category.
          if (item.category && !item.category.isActive) {
            return;
          }

          availableFoodItems.push({
            ...item,
            restaurantName: details.restaurant.name,
          });
        });
      });

      const nextData: HomeData = {
        restaurants: availableRestaurants,
        categories: buildHomeCategories(activeCategories),
        foodItems: availableFoodItems,
      };

      hasLoadedRef.current = true;

      setState({
        ...nextData,
        loading: false,
        refreshing: false,
        error: null,
      });
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setState((previous) => ({
        ...previous,
        loading: false,
        refreshing: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load home data. Please try again.',
      }));
    }
  }, []);

  useEffect(() => {
    void loadHomeData();

    return () => {
      // Ignore responses from requests that finish after unmount.
      requestIdRef.current += 1;
    };
  }, [loadHomeData]);

  const refresh = useCallback(() => {
    return loadHomeData(true);
  }, [loadHomeData]);

  const retry = useCallback(() => {
    return loadHomeData(false);
  }, [loadHomeData]);

  return {
    ...state,
    refresh,
    retry,
  };
}
