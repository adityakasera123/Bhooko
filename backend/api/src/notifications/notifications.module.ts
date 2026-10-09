
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDevicesController } from './push-devices/push-devices.controller';
import { PushDevicesService } from './push-devices/push-devices.service';
import { ExpoPushProvider } from './push/expo-push.provider';

@Module({
  imports: [AuthModule],
  controllers: [
    NotificationsController,
    PushDevicesController,
  ],
  providers: [
  NotificationsService,
  PushDevicesService,
  ExpoPushProvider,
],
  exports: [
    NotificationsService,
    PushDevicesService,
  ],
})
export class NotificationsModule {}
