
import { jest } from '@jest/globals';
import { NotificationType } from './enums/notification-type.enum';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExpoPushProvider } from './push/expo-push.provider';

describe('NotificationsService', () => {
  let service: NotificationsService;


type MockNotification = {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
};

 const notification: MockNotification = {
    id: 'notification-1',
    recipientUserId: 'user-1',
    type: NotificationType.ORDER_CONFIRMED,
    title: 'Order confirmed',
    message: 'Your order is confirmed',
    relatedEntityType: 'ORDER',
    relatedEntityId: 'order-1',
    isRead: false,
    readAt: null,
    createdAt: new Date(),
  };

  const prisma = {
    notification: {
      create: jest.fn<() => Promise<typeof notification>>(),
      findFirst: jest.fn<() => Promise<typeof notification | null>>(),
      findMany: jest.fn<() => Promise<typeof notification[]>>(),
      update: jest.fn<() => Promise<typeof notification>>(),
      updateMany: jest.fn<() => Promise<{ count: number }>>(),
    },
    pushDevice: {
      findMany: jest.fn<() => Promise<{ pushToken: string }[]>>(),
    },
  };

  const expoPushProvider = {
    send: jest.fn<() => Promise<null>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new NotificationsService(
      prisma as unknown as PrismaService,
      expoPushProvider as unknown as ExpoPushProvider,
    );

    prisma.notification.create.mockResolvedValue(notification);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.findMany.mockResolvedValue([notification]);
    prisma.notification.update.mockResolvedValue({
      ...notification,
      isRead: true,
      readAt: new Date(),
    });
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    prisma.pushDevice.findMany.mockResolvedValue([]);
    expoPushProvider.send.mockResolvedValue(null);
  });

  describe('create', () => {
    it('should persist a notification and return it', async () => {
      const result = await service.create({
        recipientUserId: 'user-1',
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Order confirmed',
        message: 'Your order is confirmed',
        relatedEntityType: 'ORDER',
        relatedEntityId: 'order-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          recipientUserId: 'user-1',
          type: NotificationType.ORDER_CONFIRMED,
          title: 'Order confirmed',
          message: 'Your order is confirmed',
          relatedEntityType: 'ORDER',
          relatedEntityId: 'order-1',
        },
      });
      expect(result).toEqual(notification);
    });

    it('should dispatch push to active devices', async () => {
      prisma.pushDevice.findMany.mockResolvedValue([
        { pushToken: 'ExponentPushToken[device-1]' },
      ]);

      await service.create({
        recipientUserId: 'user-1',
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Order confirmed',
        message: 'Your order is confirmed',
        relatedEntityType: 'ORDER',
        relatedEntityId: 'order-1',
      });

      // Allow the fire-and-forget dispatch to finish.
      await new Promise<void>((resolve) => setImmediate(resolve));

      expect(prisma.pushDevice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        select: { pushToken: true },
      });

      expect(expoPushProvider.send).toHaveBeenCalledWith({
        to: 'ExponentPushToken[device-1]',
        title: 'Order confirmed',
        body: 'Your order is confirmed',
        data: {
          relatedEntityType: 'ORDER',
          relatedEntityId: 'order-1',
        },
      });
    });

    it('should still return the notification if push dispatch fails', async () => {
      prisma.pushDevice.findMany.mockRejectedValue(
        new Error('Database unavailable'),
      );

      const result = await service.create({
        recipientUserId: 'user-1',
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Order confirmed',
        message: 'Your order is confirmed',
      });

      expect(result).toEqual(notification);
    });
  });

  describe('createIfNotExists', () => {
    it('should return an existing notification without creating another', async () => {
      prisma.notification.findFirst.mockResolvedValue(notification);

      const result = await service.createIfNotExists({
        recipientUserId: 'user-1',
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Order confirmed',
        message: 'Your order is confirmed',
        relatedEntityType: 'ORDER',
        relatedEntityId: 'order-1',
      });

      expect(result).toEqual(notification);
      expect(prisma.notification.create).not.toHaveBeenCalled();
      expect(expoPushProvider.send).not.toHaveBeenCalled();
    });

    it('should create a notification when no duplicate exists', async () => {
      await service.createIfNotExists({
        recipientUserId: 'user-1',
        type: NotificationType.ORDER_CONFIRMED,
        title: 'Order confirmed',
        message: 'Your order is confirmed',
        relatedEntityType: 'ORDER',
        relatedEntityId: 'order-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('read operations', () => {
    it('should return all notifications for a user', async () => {
      const result = await service.findAllForUser('user-1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { recipientUserId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([notification]);
    });

    it('should return only unread notifications', async () => {
      await service.findUnreadForUser('user-1');

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { recipientUserId: 'user-1', isRead: false },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return null when the notification does not belong to the user', async () => {
      prisma.notification.findFirst.mockResolvedValue(null);

      const result = await service.markAsRead(
        'notification-1',
        'another-user',
      );

      expect(result).toBeNull();
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

   
it("should mark a user's notification as read", async () => {
  prisma.notification.findFirst.mockResolvedValue(notification);

  await service.markAsRead('notification-1', 'user-1');

  expect(prisma.notification.findFirst).toHaveBeenCalledWith({
    where: {
      id: 'notification-1',
      recipientUserId: 'user-1',
    },
  });

  expect(prisma.notification.update).toHaveBeenCalledWith({
    where: { id: 'notification-1' },
    data: {
      isRead: true,
      readAt: expect.any(Date),
    },
  });
});


    it('should mark all unread notifications as read', async () => {
      await service.markAllAsRead('user-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { recipientUserId: 'user-1', isRead: false },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
    });
  });
});
