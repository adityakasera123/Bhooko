import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeModule } from '../../realtime/realtime.module';

import { DeliveryGateway } from '../gateway/delivery.gateway';
import { DeliveryRealtimeAuthService } from '../gateway/delivery-realtime-auth.service';
import { DeliveryRealtimeService } from '../gateway/delivery-realtime.service';

import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

@Module({
  imports: [
    AuthModule,
    RealtimeModule,
  ],
  controllers: [DeliveryController],
  providers: [
    DeliveryService,
    DeliveryGateway,
    DeliveryRealtimeAuthService,
    DeliveryRealtimeService,
    PrismaService,
  ],
  exports: [
    DeliveryService,
    DeliveryRealtimeService,
  ],
})
export class DeliveryModule {}