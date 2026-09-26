import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { RiderModule } from '../rider/rider.module';

import { AssignmentController } from './assignment.controller';
import { AssignmentService } from './assignment.service';

@Module({
  imports: [
    PrismaModule,
    DeliveryModule,
    RiderModule,
  ],
  controllers: [AssignmentController],
  providers: [AssignmentService],
  exports: [AssignmentService],
})
export class AssignmentModule {}