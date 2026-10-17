import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { NotificationType } from '../src/notifications/enums/notification-type.enum';

import { AppModule } from '../src/app.module';
import { NotificationsService } from '../src/notifications/notifications.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const prisma = app.get(PrismaService);
    const notificationsService = app.get(NotificationsService);

    const customer = await prisma.user.findUnique({
      where: {
        email: 'payment.test@bhooko.local',
      },
      select: {
        id: true,
      },
    });

    if (!customer) {
      throw new Error('Test customer not found.');
    }

    const activeDevice = await prisma.pushDevice.findFirst({
      where: {
        userId: customer.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!activeDevice) {
      throw new Error('No active push device registered for test customer.');
    }

    const notification = await notificationsService.create({
      recipientUserId: customer.id,
      type: NotificationType.ORDER_CONFIRMED,
      title: 'BHOOKO Backend Push Verification',
      message: 'Test notification sent through the BHOOKO backend.',
      relatedEntityType: 'PUSH_VERIFICATION',
      relatedEntityId: `verification-${Date.now()}`,
    });

    const deadline = Date.now() + 30_000;
    let receipt:
      | {
          status: string;
          expoTicketId: string | null;
          errorCode: string | null;
        }
      | null = null;

    while (Date.now() < deadline) {
      receipt = await prisma.pushReceipt.findFirst({
        where: {
          notificationId: notification.id,
        },
        select: {
          status: true,
          expoTicketId: true,
          errorCode: true,
        },
      });

      if (receipt) break;

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      JSON.stringify(
        {
          notificationCreated: true,
          activeDeviceFound: true,
          receiptCreated: Boolean(receipt),
          receiptStatus: receipt?.status ?? 'NOT_CREATED',
          expoTicketAccepted: Boolean(receipt?.expoTicketId),
          errorCode: receipt?.errorCode ?? null,
        },
        null,
        2,
      ),
    );

    if (!receipt || receipt.status !== 'PENDING') {
      process.exitCode = 1;
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Backend push verification failed.',
  );
  process.exitCode = 1;
});
