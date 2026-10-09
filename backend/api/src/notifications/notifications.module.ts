
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDevicesController } from './push-devices/push-devices.controller';
import { PushDevicesService } from './push-devices/push-devices.service';

@Module({
  imports: [AuthModule],
  controllers: [
    NotificationsController,
    PushDevicesController,
  ],
  providers: [
    NotificationsService,
    PushDevicesService,
  ],
  exports: [
    NotificationsService,
    PushDevicesService,
  ],
})
export class NotificationsModule {}
