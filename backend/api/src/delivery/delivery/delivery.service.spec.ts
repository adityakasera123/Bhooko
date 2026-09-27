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

  describe('getCustomerTracking', () => {
    const customerId = 'customer-1';

    const trackingDelivery = {
      id: deliveryId,
      orderId,
      status: DeliveryStatus.OUT_FOR_DELIVERY,
      riderId: 'rider-1',
      createdAt: new Date('2026-09-27T10:00:00.000Z'),
      updatedAt: new Date('2026-09-27T10:30:00.000Z'),
      order: {
        id: orderId,
        customerId,
        deliveryAddressLabel: 'Home',
        deliveryContactName: 'Aditya',
        deliveryContactPhone: '9999999999',
        deliveryAddressLine1: '123 Main Street',
        deliveryAddressLine2: 'Near Market',
        deliveryAddressArea: 'Sector 1',
        deliveryAddressCity: 'Noida',
        deliveryAddressState: 'Uttar Pradesh',
        deliveryAddressPincode: '201301',
        deliveryLatitude: 28.5355,
        deliveryLongitude: 77.391,
        deliveryInstructions: 'Call before arriving',
      },
      rider: {
        id: 'rider-1',
        vehicleType: 'BIKE',
        vehicleNumber: 'UP16AB1234',
        user: {
          id: 'rider-user-1',
          name: 'Rider One',
          phone: '8888888888',
        },
      },
    };

    it('should throw when delivery does not exist', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.getCustomerTracking(
          deliveryId,
          customerId,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        prismaMock.delivery.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: deliveryId,
        },
        include: {
          order: {
            select: {
              id: true,
              customerId: true,
              deliveryAddressLabel: true,
              deliveryContactName: true,
              deliveryContactPhone: true,
              deliveryAddressLine1: true,
              deliveryAddressLine2: true,
              deliveryAddressArea: true,
              deliveryAddressCity: true,
              deliveryAddressState: true,
              deliveryAddressPincode: true,
              deliveryLatitude: true,
              deliveryLongitude: true,
              deliveryInstructions: true,
            },
          },
          rider: {
            select: {
              id: true,
              vehicleType: true,
              vehicleNumber: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
      });
    });

    it('should reject access when delivery belongs to another customer', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        ...trackingDelivery,
        order: {
          ...trackingDelivery.order,
          customerId: 'another-customer',
        },
      });

      await expect(
        service.getCustomerTracking(
          deliveryId,
          customerId,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should return tracking information for the owning customer', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        trackingDelivery,
      );

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result).toEqual({
        deliveryId,
        orderId,
        status: DeliveryStatus.OUT_FOR_DELIVERY,

        rider: {
          id: 'rider-1',
          name: 'Rider One',
          phone: '8888888888',
          vehicleType: 'BIKE',
          vehicleNumber: 'UP16AB1234',
        },

        deliveryAddress: {
          label: 'Home',
          contactName: 'Aditya',
          contactPhone: '9999999999',
          addressLine1: '123 Main Street',
          addressLine2: 'Near Market',
          area: 'Sector 1',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
          latitude: 28.5355,
          longitude: 77.391,
          instructions: 'Call before arriving',
        },

        timestamps: {
          createdAt: trackingDelivery.createdAt,
          updatedAt: trackingDelivery.updatedAt,
        },
      });
    });

    it('should return null rider when no rider is assigned', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue({
        ...trackingDelivery,
        rider: null,
      });

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.rider).toBeNull();
    });

    it('should return the current delivery status', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        trackingDelivery,
      );

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.status).toBe(
        DeliveryStatus.OUT_FOR_DELIVERY,
      );
    });

    it('should return the delivery address snapshot', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        trackingDelivery,
      );

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.deliveryAddress).toEqual({
        label: 'Home',
        contactName: 'Aditya',
        contactPhone: '9999999999',
        addressLine1: '123 Main Street',
        addressLine2: 'Near Market',
        area: 'Sector 1',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201301',
        latitude: 28.5355,
        longitude: 77.391,
        instructions: 'Call before arriving',
      });
    });

    it('should return rider information when a rider is assigned', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        trackingDelivery,
      );

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.rider).toEqual({
        id: 'rider-1',
        name: 'Rider One',
        phone: '8888888888',
        vehicleType: 'BIKE',
        vehicleNumber: 'UP16AB1234',
      });
    });

    it('should return delivery timestamps', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        trackingDelivery,
      );

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.timestamps).toEqual({
        createdAt: trackingDelivery.createdAt,
        updatedAt: trackingDelivery.updatedAt,
      });
    });
  });
});