export const REALTIME_ROOM_PREFIX = {
  DELIVERY: 'delivery',
  ORDER: 'order',
  RESTAURANT: 'restaurant',
  RIDER: 'rider',
  CUSTOMER: 'customer',
} as const;

export const REALTIME_ROOMS = {
  delivery: (deliveryId: string): string =>
    `${REALTIME_ROOM_PREFIX.DELIVERY}:${deliveryId}`,

  order: (orderId: string): string =>
    `${REALTIME_ROOM_PREFIX.ORDER}:${orderId}`,

  restaurant: (restaurantId: string): string =>
    `${REALTIME_ROOM_PREFIX.RESTAURANT}:${restaurantId}`,

  rider: (riderId: string): string =>
    `${REALTIME_ROOM_PREFIX.RIDER}:${riderId}`,

  customer: (customerId: string): string =>
    `${REALTIME_ROOM_PREFIX.CUSTOMER}:${customerId}`,
} as const;
