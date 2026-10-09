
import { jest } from '@jest/globals';
import { PushReceiptStatus } from '@prisma/client';
import type { ExpoPushReceipt } from 'expo-server-sdk';

import { PrismaService } from '../../prisma/prisma.service';
import { ExpoPushProvider } from './expo-push.provider';
import { PushReceiptService } from './push-receipt.service';

describe('PushReceiptService', () => {
  let service: PushReceiptService;

  const pendingReceipt = {
    id: 'receipt-1',
    expoTicketId: 'ticket-123',
    pushDeviceId: 'device-1',
  };

  const prisma = {
    pushReceipt: {
      findMany: jest.fn<
        () => Promise<typeof pendingReceipt[]>
      >(),
      update: jest.fn<() => Promise<{ id: string }>>(),
    },
    pushDevice: {
      updateMany: jest.fn<() => Promise<{ count: number }>>(),
    },
  };

  const expoPushProvider = {
    getReceipts: jest.fn<
      () => Promise<Record<string, ExpoPushReceipt>>
    >(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new PushReceiptService(
      prisma as unknown as PrismaService,
      expoPushProvider as unknown as ExpoPushProvider,
    );

    prisma.pushReceipt.findMany.mockResolvedValue([pendingReceipt]);
    prisma.pushReceipt.update.mockResolvedValue({ id: 'receipt-1' });
    prisma.pushDevice.updateMany.mockResolvedValue({ count: 1 });
    expoPushProvider.getReceipts.mockResolvedValue({});
  });

  it('should not fetch receipts when no eligible records exist', async () => {
    prisma.pushReceipt.findMany.mockResolvedValue([]);

    await service.processPendingReceipts();

    expect(expoPushProvider.getReceipts).not.toHaveBeenCalled();
    expect(prisma.pushReceipt.update).not.toHaveBeenCalled();
  });

  it('should mark a successful Expo receipt as OK', async () => {
    expoPushProvider.getReceipts.mockResolvedValue({
      'ticket-123': { status: 'ok' } as ExpoPushReceipt,
    });

    await service.processPendingReceipts();

    expect(prisma.pushReceipt.update).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      data: {
        status: PushReceiptStatus.OK,
        errorCode: null,
        errorMessage: null,
        receiptCheckedAt: expect.any(Date),
      },
    });

    expect(prisma.pushDevice.updateMany).not.toHaveBeenCalled();
  });

  it('should deactivate a device for DeviceNotRegistered', async () => {
    expoPushProvider.getReceipts.mockResolvedValue({
      'ticket-123': {
        status: 'error',
        message: 'The device is not registered',
        details: { error: 'DeviceNotRegistered' },
      } as ExpoPushReceipt,
    });

    await service.processPendingReceipts();

    expect(prisma.pushReceipt.update).toHaveBeenCalledWith({
      where: { id: 'receipt-1' },
      data: {
        status: PushReceiptStatus.ERROR,
        errorCode: 'DeviceNotRegistered',
        errorMessage: 'The device is not registered',
        receiptCheckedAt: expect.any(Date),
      },
    });

    expect(prisma.pushDevice.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'device-1',
        isActive: true,
      },
      data: { isActive: false },
    });
  });

  it('should leave receipts pending when Expo receipt fetching fails', async () => {
    expoPushProvider.getReceipts.mockRejectedValue(
      new Error('Expo unavailable'),
    );

    await service.processPendingReceipts();

    expect(prisma.pushReceipt.update).not.toHaveBeenCalled();
    expect(prisma.pushDevice.updateMany).not.toHaveBeenCalled();
  });
});
