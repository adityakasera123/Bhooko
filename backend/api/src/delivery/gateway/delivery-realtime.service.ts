import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

export interface DeliveryRealtimeEvent {
  deliveryId: string;
  event: string;
  status?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

@Injectable()
export class DeliveryRealtimeService {
  private server?: Server;

  setServer(server: Server): void {
    this.server = server;
  }

  emitToDelivery(
    deliveryId: string,
    event: DeliveryRealtimeEvent,
  ): void {
    if (!this.server) {
      return;
    }

    this.server
      .to(`delivery:${deliveryId}`)
      .emit(event.event, event);
  }
}