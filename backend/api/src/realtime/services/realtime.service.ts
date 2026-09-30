import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

export interface RealtimeEvent {
  deliveryId?: string;
  event: string;
  timestamp: string;
  status?: string;
  data?: Record<string, unknown>;
}

type LegacyDeliveryEmitter = (
  deliveryId: string,
  event: RealtimeEvent,
) => void;

@Injectable()
export class RealtimeService {
  private server?: Server;

  private legacyDeliveryEmitter?: LegacyDeliveryEmitter;

  setServer(server: Server): void {
    this.server = server;
  }

  setLegacyDeliveryEmitter(
    emitter: LegacyDeliveryEmitter,
  ): void {
    this.legacyDeliveryEmitter = emitter;
  }

  emitToDelivery(
    deliveryId: string,
    event: RealtimeEvent,
  ): void {
    const realtimeEvent: RealtimeEvent = {
      ...event,
      deliveryId,
    };

    if (this.server) {
      this.server
        .to(`delivery:${deliveryId}`)
        .emit(realtimeEvent.event, realtimeEvent);
    }

    if (this.legacyDeliveryEmitter) {
      this.legacyDeliveryEmitter(
        deliveryId,
        realtimeEvent,
      );
    }
  }

  emitToOrder(
    orderId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(`order:${orderId}`, event);
  }

  emitToRestaurant(
    restaurantId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(`restaurant:${restaurantId}`, event);
  }

  emitToRider(
    riderId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(`rider:${riderId}`, event);
  }

  emitToCustomer(
    customerId: string,
    event: RealtimeEvent,
  ): void {
    this.emitToRoom(`customer:${customerId}`, event);
  }

  emitToRoom(
    room: string,
    event: RealtimeEvent,
  ): void {
    if (!this.server) {
      return;
    }

    this.server.to(room).emit(event.event, event);
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

  emitDeliveryEvent(
    deliveryId: string,
    event: string,
    options?: {
      status?: string;
      data?: Record<string, unknown>;
    },
  ): void {
    this.emitToDelivery(
      deliveryId,
      this.createEvent(event, options),
    );
  }

  emitDeliveryRiderAssigned(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:rider_assigned',
      { status, data },
    );
  }

  emitDeliveryRiderAccepted(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:rider_accepted',
      { status, data },
    );
  }

  emitDeliveryAssignmentRejected(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:assignment_rejected',
      { status, data },
    );
  }

  emitDeliveryArrivedAtRestaurant(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:arrived_at_restaurant',
      { status, data },
    );
  }

  emitDeliveryPickedUp(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:picked_up',
      { status, data },
    );
  }

  emitDeliveryOutForDelivery(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:out_for_delivery',
      { status, data },
    );
  }

  emitDeliveryDelivered(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:delivered',
      { status, data },
    );
  }

  emitDeliveryFailed(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:failed',
      { status, data },
    );
  }

  emitDeliveryCancelled(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:cancelled',
      { status, data },
    );
  }

  emitOrderStatusChanged(
    orderId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToOrder(
      orderId,
      this.createEvent(
        'order:statusChanged',
        { status, data },
      ),
    );
  }

  emitOrderUpdated(
    orderId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToOrder(
      orderId,
      this.createEvent('order:updated', { data }),
    );
  }

  emitDeliveryStatusChanged(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:statusChanged',
      { status, data },
    );
  }

  emitDeliveryUpdated(
    deliveryId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitDeliveryEvent(
      deliveryId,
      'delivery:updated',
      { data },
    );
  }

  emitRestaurantOrderReceived(
    restaurantId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToRestaurant(
      restaurantId,
      this.createEvent(
        'restaurant:orderReceived',
        { data },
      ),
    );
  }

  emitRestaurantOrderUpdated(
    restaurantId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToRestaurant(
      restaurantId,
      this.createEvent(
        'restaurant:orderUpdated',
        { data },
      ),
    );
  }

  emitRiderDeliveryAssigned(
    riderId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToRider(
      riderId,
      this.createEvent(
        'rider:deliveryAssigned',
        { data },
      ),
    );
  }

  emitCustomerOrderUpdated(
    customerId: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitToCustomer(
      customerId,
      this.createEvent(
        'customer:orderUpdated',
        { data },
      ),
    );
  }
}