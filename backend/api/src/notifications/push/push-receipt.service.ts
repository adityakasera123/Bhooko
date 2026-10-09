
import { Injectable, Logger } from '@nestjs/common';
import { PushReceiptStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { ExpoPushProvider } from './expo-push.provider';

@Injectable()
export class PushReceiptService {
  private readonly logger = new Logger(PushReceiptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly expoPushProvider: ExpoPushProvider,
  ) {}

  async processPendingReceipts(): Promise<void> {
    const pendingReceipts = await this.prisma.pushReceipt.findMany({
      where: {
        status: PushReceiptStatus.PENDING,
        expoTicketId: { not: null },
        ticketCreatedAt: {
          lte: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
      orderBy: { ticketCreatedAt: 'asc' },
      take: 100,
      select: {
        id: true,
        expoTicketId: true,
        pushDeviceId: true,
      },
    });

    const receiptsByTicket = new Map<string, string[]>();

    for (const receipt of pendingReceipts) {
      if (!receipt.expoTicketId) continue;

      const ids = receiptsByTicket.get(receipt.expoTicketId) ?? [];
      ids.push(receipt.id);
      receiptsByTicket.set(receipt.expoTicketId, ids);
    }

    if (receiptsByTicket.size === 0) return;

    const ticketIds = [...receiptsByTicket.keys()];

    let expoReceipts;
    try {
      expoReceipts = await this.expoPushProvider.getReceipts(ticketIds);
    } catch (error: unknown) {
      this.logger.warn(
        'Unable to fetch Expo push receipts; leaving records pending.',
      );
      return;
    }

    for (const [ticketId, receiptIds] of receiptsByTicket) {
      const expoReceipt = expoReceipts[ticketId];
      if (!expoReceipt) continue;

      for (const receiptId of receiptIds) {
        const storedReceipt = pendingReceipts.find(
          (receipt) => receipt.id === receiptId,
        );
        if (!storedReceipt) continue;

        if (expoReceipt.status === 'ok') {
          await this.prisma.pushReceipt.update({
            where: { id: receiptId },
            data: {
              status: PushReceiptStatus.OK,
              errorCode: null,
              errorMessage: null,
              receiptCheckedAt: new Date(),
            },
          });
          continue;
        }

        const errorCode = expoReceipt.details?.error ?? 'UNKNOWN_ERROR';
        const errorMessage = expoReceipt.message ?? 'Expo receipt reported an error.';

        await this.prisma.pushReceipt.update({
          where: { id: receiptId },
          data: {
            status: PushReceiptStatus.ERROR,
            errorCode,
            errorMessage,
            receiptCheckedAt: new Date(),
          },
        });

        if (errorCode === 'DeviceNotRegistered') {
          await this.prisma.pushDevice.updateMany({
            where: {
              id: storedReceipt.pushDeviceId,
              isActive: true,
            },
            data: { isActive: false },
          });
        }
      }
    }
  }
}
