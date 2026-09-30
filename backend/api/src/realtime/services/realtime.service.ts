import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

export interface RealtimeEvent {
  event: string;
  timestamp: string;
  status?: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class RealtimeService {
  private server?: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToDelivery(
    deliveryId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(
      `delivery:${deliveryId}`,
      event,
    );
  }

  emitToOrder(
    orderId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(
      `order:${orderId}`,
      event,
    );
  }

  emitToRestaurant(
    restaurantId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(
      `restaurant:${restaurantId}`,
      event,
    );
  }

  emitToRider(
    riderId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(
      `rider:${riderId}`,
      event,
    );
  }

  emitToCustomer(
    customerId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(
      `customer:${customerId}`,
      event,
    );
  }

  emitToRoom(
    room: string,
    event: RealtimeEvent,
  ): void {
    if (!this.server) {
      return;
    }

    this.server
      .to(room)
      .emit(event.event, event);
  }

  createEvent(
    event: string,
    options?: {
      status?: string;
      data?: Record<string, unknown>;
    },
  ): RealtimeEvent {
    return {
      event,
      timestamp: new Date().toISOString(),
      ...(options?.status !== undefined && {
        status: options.status,
      }),
      ...(options?.data !== undefined && {
        data: options.data,
      }),
    };
  }

    emitOrderStatusChanged(
    orderId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToOrder(
      orderId,
      this.createEvent('order:statusChanged', {
        status,
        data,
      }),
    );
  }

  emitOrderUpdated(
    orderId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToOrder(
      orderId,
      this.createEvent('order:updated', {
        data,
      }),
    );
  }

  emitDeliveryStatusChanged(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToDelivery(
      deliveryId,
      this.createEvent('delivery:statusChanged', {
        status,
        data,
      }),
    );
  }

  emitDeliveryUpdated(
    deliveryId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToDelivery(
      deliveryId,
      this.createEvent('delivery:updated', {
        data,
      }),
    );
  }

  emitRestaurantOrderReceived(
    restaurantId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToRestaurant(
      restaurantId,
      this.createEvent('restaurant:orderReceived', {
        data,
      }),
    );
  }

  emitRestaurantOrderUpdated(
    restaurantId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToRestaurant(
      restaurantId,
      this.createEvent('restaurant:orderUpdated', {
        data,
      }),
    );
  }

  emitRiderDeliveryAssigned(
    riderId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToRider(
      riderId,
      this.createEvent('rider:deliveryAssigned', {
        data,
      }),
    );
  }

  emitCustomerOrderUpdated(
    customerId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToCustomer(
      customerId,
      this.createEvent('customer:orderUpdated', {
        data,
      }),
    );
  }
  
}
