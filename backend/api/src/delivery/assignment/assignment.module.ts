import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { RiderModule } from '../rider/rider.module';

import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';
import { RealtimeModule } from '../../realtime/realtime.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { AuthModule } from '../../auth/auth.module';
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    DeliveryModule,
    RiderModule,
    RealtimeModule,
    NotificationsModule
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}