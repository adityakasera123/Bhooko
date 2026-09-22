import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PricingModule } from '../pricing/pricing.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStateMachineService } from './order-state-machine.service';

@Module({
  imports: [AuthModule, PricingModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStateMachineService],
})
export class OrdersModule {}