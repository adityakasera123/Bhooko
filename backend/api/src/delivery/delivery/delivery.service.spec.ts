import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  DeliveryEventType,
  DeliveryStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryService } from './delivery.service';

type MockFn = jest.MockedFunction<any>;

type TxMock = {
  delivery: {
    create: MockFn;
  };
  deliveryEvent: {
    create: MockFn;
  };
};

type TransactionMock = MockFn;

describe('DeliveryService', () => {
  let service: DeliveryService;

  const orderId = 'order-1';
  const deliveryId = 'delivery-1';

  const delivery = {
    id: deliveryId,
    orderId,
    riderId: null,
    status: DeliveryStatus.CREATED,
    pickupAt: null,
    outForDeliveryAt: null,
    deliveredAt: null,
    failedAt: null,
    cancelledAt: null,
    failureReason: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const txMock: TxMock = {
    delivery: {
      create: jest.fn() as MockFn,
    },
    deliveryEvent: {
      create: jest.fn() as MockFn,
    },
  };

  const transactionMock = jest.fn() as TransactionMock;

  const prismaMock = {
    order: {
      findUnique: jest.fn() as MockFn,
    },
    delivery: {
      findUnique: jest.fn() as MockFn,
    },
    $transaction: transactionMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    transactionMock.mockImplementation(
      async (callback: any) => {
        return callback(txMock);
      },
    );

    service = new DeliveryService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('createDelivery', () => {
    it('should create a delivery for a valid order', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: orderId,
        delivery: null,
      });

      txMock.delivery.create.mockResolvedValue(delivery);

      txMock.deliveryEvent.create.mockResolvedValue({
        id: 'event-1',
        deliveryId,
        type: DeliveryEventType.CREATED,
      });

      const result = await service.createDelivery(orderId);

      expect(result).toEqual(delivery);

      expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
        where: { id: orderId },
        select: {
          id: true,
          delivery: {
            select: {
              id: true,
            },
          },
        },
      });

      expect(txMock.delivery.create).toHaveBeenCalledWith({
        data: {
          orderId,
          status: DeliveryStatus.CREATED,
        },
      });

      expect(txMock.deliveryEvent.create).toHaveBeenCalledWith({
        data: {
          deliveryId,
          type: DeliveryEventType.CREATED,
        },
      });

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw when order does not exist', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createDelivery(orderId),
      ).rejects.toThrow(NotFoundException);

      expect(txMock.delivery.create).not.toHaveBeenCalled();
      expect(txMock.deliveryEvent.create).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should reject duplicate delivery for the same order', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: orderId,
        delivery: {
          id: deliveryId,
        },
      });

      await expect(
        service.createDelivery(orderId),
      ).rejects.toThrow(ConflictException);

      expect(txMock.delivery.create).not.toHaveBeenCalled();
      expect(txMock.deliveryEvent.create).not.toHaveBeenCalled();
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('should create the delivery with CREATED status', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: orderId,
        delivery: null,
      });

      txMock.delivery.create.mockResolvedValue(delivery);

      txMock.deliveryEvent.create.mockResolvedValue({
        id: 'event-1',
        deliveryId,
        type: DeliveryEventType.CREATED,
      });

      await service.createDelivery(orderId);

      expect(txMock.delivery.create).toHaveBeenCalledWith({
        data: {
          orderId,
          status: DeliveryStatus.CREATED,
        },
      });
    });

    it('should create a CREATED delivery event', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: orderId,
        delivery: null,
      });

      txMock.delivery.create.mockResolvedValue(delivery);

      txMock.deliveryEvent.create.mockResolvedValue({
        id: 'event-1',
        deliveryId,
        type: DeliveryEventType.CREATED,
      });

      await service.createDelivery(orderId);

      expect(txMock.deliveryEvent.create).toHaveBeenCalledWith({
        data: {
          deliveryId,
          type: DeliveryEventType.CREATED,
        },
      });
    });

    it('should create delivery and event inside the transaction', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: orderId,
        delivery: null,
      });

      txMock.delivery.create.mockResolvedValue(delivery);

      txMock.deliveryEvent.create.mockResolvedValue({
        id: 'event-1',
        deliveryId,
        type: DeliveryEventType.CREATED,
      });

      await service.createDelivery(orderId);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.delivery.create).toHaveBeenCalledTimes(1);
      expect(txMock.deliveryEvent.create).toHaveBeenCalledTimes(1);
    });
  });
});