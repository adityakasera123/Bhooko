
import { Injectable, Logger } from '@nestjs/common';
import { PushReceiptStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from './enums/notification-type.enum';
import { ExpoPushProvider } from './push/expo-push.provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

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
    // Persist the notification before attempting push delivery.
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

    // Push delivery and receipt persistence must not fail the business operation.
    void this.dispatchPush(notification).catch((error: unknown) => {
      this.logger.error(
        'Push dispatch failed after notification creation.',
        error instanceof Error ? error.stack : undefined,
      );
    });

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
    id: string;
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
        id: true,
        pushToken: true,
      },
    });

    await Promise.all(
      devices.map(async (device) => {
        try {
          const ticket = await this.expoPushProvider.send({
            to: device.pushToken,
            title: notification.title,
            body: notification.message,
            data: {
              ...(notification.relatedEntityType
                ? {
                    relatedEntityType: notification.relatedEntityType,
                  }
                : {}),
              ...(notification.relatedEntityId
                ? {
                    relatedEntityId: notification.relatedEntityId,
                  }
                : {}),
            },
          });

          if (!ticket) {
            await this.savePushError(
              notification.id,
              device.id,
              'NO_TICKET',
              'Expo did not return a push ticket.',
            );
            return;
          }

          if (ticket.status === 'ok') {
            await this.prisma.pushReceipt.create({
              data: {
                notificationId: notification.id,
                pushDeviceId: device.id,
                expoTicketId: ticket.id,
                status: PushReceiptStatus.PENDING,
              },
            });

            return;
          }

          // Expo rejected the push request at ticket-submission time.
          const errorCode = ticket.details?.error ?? 'EXPO_TICKET_ERROR';

          await this.savePushError(
            notification.id,
            device.id,
            errorCode,
            ticket.message,
          );

          // Only deactivate tokens when Expo explicitly confirms this error.
          if (errorCode === 'DeviceNotRegistered') {
            await this.prisma.pushDevice.updateMany({
              where: {
                id: device.id,
                isActive: true,
              },
              data: {
                isActive: false,
              },
            });
          }
        } catch (error: unknown) {
          // Keep push problems isolated from order/payment business flows.
          this.logger.error(
            `Push dispatch or receipt persistence failed for device ${device.id}.`,
            error instanceof Error ? error.stack : undefined,
          );
        }
      }),
    );
  }

  private async savePushError(
    notificationId: string,
    pushDeviceId: string,
    errorCode: string,
    errorMessage: string | null | undefined,
  ): Promise<void> {
    await this.prisma.pushReceipt.create({
      data: {
        notificationId,
        pushDeviceId,
        status: PushReceiptStatus.ERROR,
        errorCode,
        errorMessage: errorMessage ?? null,
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
