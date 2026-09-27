import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { DeliveryGateway } from '../gateway/delivery.gateway';
import { DeliveryRealtimeAuthService } from '../gateway/delivery-realtime-auth.service';

@Module({
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    DeliveryGateway,
    DeliveryRealtimeAuthService,
    PrismaService,
    
  ],
  exports: [DeliveryService],
})
export class DeliveryModule {}