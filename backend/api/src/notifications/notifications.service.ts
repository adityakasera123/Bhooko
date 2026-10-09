
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from './enums/notification-type.enum';
import { ExpoPushProvider } from './push/expo-push.provider';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expoPushProvider: ExpoPushProvider,
  ) {}

  async create(data: {
    recipientUserId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    // Save the persistent notification first.
    const notification = await this.prisma.notification.create({
      data: {
        recipientUserId: data.recipientUserId,
        type: data.type,
        title: data.title,
        message: data.message,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      },
    });

    // Push delivery must not block or fail the business operation.
    void this.dispatchPush(notification).catch(() => undefined);

    return notification;
  }

  async createIfNotExists(data: {
    recipientUserId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
  }) {
    const existing = await this.prisma.notification.findFirst({
      where: {
        recipientUserId: data.recipientUserId,
        type: data.type,
        relatedEntityType: data.relatedEntityType,
        relatedEntityId: data.relatedEntityId,
      },
    });

    if (existing) {
      return existing;
    }

    return this.create(data);
  }

  private async dispatchPush(notification: {
    recipientUserId: string;
    title: string;
    message: string;
    relatedEntityType: string | null;
    relatedEntityId: string | null;
  }): Promise<void> {
    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId: notification.recipientUserId,
        isActive: true,
      },
      select: {
        pushToken: true,
      },
    });

    await Promise.all(
      devices.map(async (device) => {
        try {
          await this.expoPushProvider.send({
            to: device.pushToken,
            title: notification.title,
            body: notification.message,
            data: {
              ...(notification.relatedEntityType
                ? {
                    relatedEntityType:
                      notification.relatedEntityType,
                  }
                : {}),
              ...(notification.relatedEntityId
                ? {
                    relatedEntityId: notification.relatedEntityId,
                  }
                : {}),
            },
          });
        } catch {
          // Push failure must not affect persistent notifications.
        }
      }),
    );
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
