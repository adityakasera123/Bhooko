import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

import {
  RealtimeEvent,
  RealtimeService,
} from '../../realtime/services/realtime.service';

@Injectable()
export class DeliveryRealtimeService {
  private server?: Server;

  constructor(
    private readonly realtimeService: RealtimeService,
  ) {
    this.realtimeService.setLegacyDeliveryEmitter(
      (deliveryId, event) => {
        this.emitLegacyToDelivery(
          deliveryId,
          event,
        );
      },
    );
  }

  setServer(server: Server): void {
    this.server = server;
  }

  emitToDelivery(
    deliveryId: string,
    event: RealtimeEvent,
  ): void {
    this.emitLegacyToDelivery(
      deliveryId,
      event,
    );
  }

  emitDeliveryStatusChanged(
    deliveryId: string,
    status: string,
    data?: Record<string, unknown>,
  ): void {
    this.emitLegacyToDelivery(
      deliveryId,
      {
        deliveryId,
        event: 'delivery:statusChanged',
        status,
        timestamp: new Date().toISOString(),
        data,
      },
    );
  }

  private emitLegacyToDelivery(
    deliveryId: string,
    event: RealtimeEvent,
  ): void {
    if (!this.server) {
      return;
    }

    this.server
      .to(`delivery:${deliveryId}`)
      .emit(event.event, event);
  }
}