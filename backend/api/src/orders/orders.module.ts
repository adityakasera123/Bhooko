import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';
import { PaymentsModule } from '../payments/payments.module';
import { DeliveryModule } from '../delivery/delivery/delivery.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    AuthModule,
    PricingModule,
    PaymentsModule,
    DeliveryModule,
    RealtimeModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateMachineService],
})
export class OrdersModule {}