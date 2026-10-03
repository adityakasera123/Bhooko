import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from './enums/notification-type.enum';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    recipientUserId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        recipientUserId: data.recipientUserId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      },
    });
  }

  async findAllForUser(userId: string) {
  return this.prisma.notification.findMany({
    where: {
      recipientUserId: userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async findUnreadForUser(userId: string) {
  return this.prisma.notification.findMany({
    where: {
      recipientUserId: userId,
      isRead: false,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async markAsRead(notificationId: string, userId: string) {
  const notification = await this.prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientUserId: userId,
    },
  });

  if (!notification) {
    return null;
  }

  return this.prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}

async markAllAsRead(userId: string) {
  return this.prisma.notification.updateMany({
    where: {
      recipientUserId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });
}
}