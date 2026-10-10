
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDevicesController } from './push-devices/push-devices.controller';
import { PushDevicesService } from './push-devices/push-devices.service';
import { ExpoPushProvider } from './push/expo-push.provider';
import { PushReceiptService } from './push/push-receipt.service';

@Module({
  imports: [
    AuthModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    NotificationsController,
    PushDevicesController,
  ],
  providers: [
    NotificationsService,
    PushDevicesService,
    ExpoPushProvider,
    PushReceiptService,
  ],
  exports: [
    NotificationsService,
    PushDevicesService,
  ],
})
export class NotificationsModule {}
