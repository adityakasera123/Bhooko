import { Injectable } from '@nestjs/common';

import { REALTIME_ROOMS } from './room.constants';

@Injectable()
export class RoomService {
  delivery(deliveryId: string): string {
    return REALTIME_ROOMS.delivery(deliveryId);
  }

  order(orderId: string): string {
    return REALTIME_ROOMS.order(orderId);
  }

  restaurant(restaurantId: string): string {
    return REALTIME_ROOMS.restaurant(restaurantId);
  }

  rider(riderId: string): string {
    return REALTIME_ROOMS.rider(riderId);
  }

  customer(customerId: string): string {
    return REALTIME_ROOMS.customer(customerId);
  }
}
