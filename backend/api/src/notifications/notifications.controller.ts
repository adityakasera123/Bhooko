import {
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getNotifications(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.findAllForUser(user.userId);
  }

  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async getUnreadNotifications(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.findUnreadForUser(user.userId);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(
      notificationId,
      user.userId,
    );
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.notificationsService.markAllAsRead(user.userId);
  }
}
