import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryEventType,
  DeliveryStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryRealtimeService } from '../gateway/delivery-realtime.service';
import { DeliveryService } from './delivery.service';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { ConfigService } from '@nestjs/config';

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
  const riderId = 'rider-1';
  const riderUserId = 'rider-user-1';
  const customerId = 'customer-1';

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
    rider: {
      findUnique: jest.fn() as MockFn,
    },
    delivery: {
      findUnique: jest.fn() as MockFn,
      updateMany: jest.fn() as MockFn,
    },
    $transaction: transactionMock,
  };

  const deliveryRealtimeMock = {
    emitToDelivery: jest.fn(),
  };



const configServiceMock = {
  get: jest.fn<(key: string) => string | undefined>(
    (key: string) => {
      if (key === 'GOOGLE_ROUTES_API_KEY') {
        return undefined;
      }

      return undefined;
    },
  ),
};


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

  beforeEach(() => {
    jest.clearAllMocks();

    transactionMock.mockImplementation(
      async (callback: any) => callback(txMock),
    );



service = new DeliveryService(
  prismaMock as unknown as PrismaService,
  deliveryRealtimeMock as unknown as DeliveryRealtimeService,
  configServiceMock as unknown as ConfigService,
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
        delivery: { id: deliveryId },
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
      txMock.deliveryEvent.create.mockResolvedValue({ id: 'event-1' });

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
      txMock.deliveryEvent.create.mockResolvedValue({ id: 'event-1' });

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
      txMock.deliveryEvent.create.mockResolvedValue({ id: 'event-1' });

      await service.createDelivery(orderId);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(txMock.delivery.create).toHaveBeenCalledTimes(1);
      expect(txMock.deliveryEvent.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateRiderLocation', () => {
    const makeDto = (
      overrides: Partial<UpdateDeliveryLocationDto> = {},
    ): UpdateDeliveryLocationDto => ({
      latitude: 28.5355,
      longitude: 77.391,
      accuracyMeters: 12,
      recordedAt: new Date().toISOString(),
      ...overrides,
    });

    const makeActiveDelivery = (
      overrides: Record<string, unknown> = {},
    ) => ({
      id: deliveryId,
      riderId,
      status: DeliveryStatus.OUT_FOR_DELIVERY,
      riderLocationRecordedAt: null,
      ...overrides,
    });

    const arrangeAssignedRider = () => {
      prismaMock.rider.findUnique.mockResolvedValue({ id: riderId });
    };

    const arrangeActiveDelivery = (
      overrides: Record<string, unknown> = {},
    ) => {
      prismaMock.delivery.findUnique.mockResolvedValue(
        makeActiveDelivery(overrides),
      );
    };

    it('should persist a valid rider location and emit a realtime event', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery();

      prismaMock.delivery.updateMany.mockResolvedValue({ count: 1 });

      const dto = makeDto();
      const result = await service.updateRiderLocation(
        deliveryId,
        riderUserId,
        dto,
      );

      expect(prismaMock.rider.findUnique).toHaveBeenCalledWith({
        where: { userId: riderUserId },
        select: { id: true },
      });

      expect(prismaMock.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: deliveryId,
            riderId,
            status: {
              in: [
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.RIDER_ACCEPTED,
                DeliveryStatus.ARRIVED_AT_RESTAURANT,
                DeliveryStatus.PICKED_UP,
                DeliveryStatus.OUT_FOR_DELIVERY,
              ],
            },
          }),
          data: expect.objectContaining({
            riderLatitude: dto.latitude,
            riderLongitude: dto.longitude,
            riderLocationAccuracyMeters: dto.accuracyMeters,
            riderLocationRecordedAt: new Date(dto.recordedAt),
          }),
        }),
      );

      expect(result.deliveryId).toBe(deliveryId);
      expect(result.location).toEqual(
        expect.objectContaining({
          latitude: dto.latitude,
          longitude: dto.longitude,
          accuracyMeters: dto.accuracyMeters,
          recordedAt: new Date(dto.recordedAt).toISOString(),
        }),
      );
      expect(result.location.receivedAt).toEqual(expect.any(String));

      expect(deliveryRealtimeMock.emitToDelivery).toHaveBeenCalledWith(
        deliveryId,
        expect.objectContaining({
          event: 'delivery:locationUpdated',
          data: {
            location: expect.objectContaining({
              latitude: dto.latitude,
              longitude: dto.longitude,
            }),
          },
        }),
      );
    });

    it('should reject a user who is not registered as a rider', async () => {
      prismaMock.rider.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto(),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.delivery.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should throw when the delivery does not exist', async () => {
      arrangeAssignedRider();
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto(),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should reject a rider who is not assigned to the delivery', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery({ riderId: 'different-rider' });

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto(),
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should reject location updates for an inactive delivery', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery({ status: DeliveryStatus.DELIVERED });

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto(),
        ),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should reject a timestamp too far in the future', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery();

      const futureTimestamp = new Date(
        Date.now() + 2 * 60_000,
      ).toISOString();

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto({ recordedAt: futureTimestamp }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should reject a timestamp older than five minutes', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery();

      const oldTimestamp = new Date(
        Date.now() - 6 * 60_000,
      ).toISOString();

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto({ recordedAt: oldTimestamp }),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should reject a timestamp that is not newer than the saved location', async () => {
      arrangeAssignedRider();

      const previousTimestamp = new Date(
        Date.now() - 30_000,
      );

      arrangeActiveDelivery({
        riderLocationRecordedAt: previousTimestamp,
      });

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto({
            recordedAt: previousTimestamp.toISOString(),
          }),
        ),
      ).rejects.toThrow(ConflictException);

      expect(prismaMock.delivery.updateMany).not.toHaveBeenCalled();
      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should reject an update superseded by a concurrent newer update', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery();

      prismaMock.delivery.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto(),
        ),
      ).rejects.toThrow(ConflictException);

      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });

    it('should save null accuracy when accuracy is omitted', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery();

      prismaMock.delivery.updateMany.mockResolvedValue({ count: 1 });

      await service.updateRiderLocation(
        deliveryId,
        riderUserId,
        makeDto({ accuracyMeters: undefined }),
      );

      expect(prismaMock.delivery.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            riderLocationAccuracyMeters: null,
          }),
        }),
      );
    });

    it('should not emit realtime location when the database update fails', async () => {
      arrangeAssignedRider();
      arrangeActiveDelivery();

      prismaMock.delivery.updateMany.mockRejectedValue(
        new Error('Database unavailable'),
      );

      await expect(
        service.updateRiderLocation(
          deliveryId,
          riderUserId,
          makeDto(),
        ),
      ).rejects.toThrow('Database unavailable');

      expect(deliveryRealtimeMock.emitToDelivery).not.toHaveBeenCalled();
    });
  });

  describe('getCustomerTracking', () => {
    const trackingDelivery = {
      id: deliveryId,
      orderId,
      status: DeliveryStatus.OUT_FOR_DELIVERY,
      riderId,
      riderLatitude: null,
      riderLongitude: null,
      riderLocationAccuracyMeters: null,
      riderLocationRecordedAt: null,
      riderLocationReceivedAt: null,
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
        id: riderId,
        vehicleType: 'BIKE',
        vehicleNumber: 'UP16AB1234',
        user: {
          id: riderUserId,
          name: 'Rider One',
          phone: '8888888888',
        },
      },
    };

    it('should throw when delivery does not exist', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(null);

      await expect(
        service.getCustomerTracking(deliveryId, customerId),
      ).rejects.toThrow(NotFoundException);

      expect(prismaMock.delivery.findUnique).toHaveBeenCalledWith({
        where: { id: deliveryId },
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
        service.getCustomerTracking(deliveryId, customerId),
      ).rejects.toThrow(ConflictException);
    });

    it('should return tracking information for the owning customer', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(trackingDelivery);

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result).toEqual({
        deliveryId,
        orderId,
        status: DeliveryStatus.OUT_FOR_DELIVERY,
        riderLocation: null,
        rider: {
          id: riderId,
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
      prismaMock.delivery.findUnique.mockResolvedValue(trackingDelivery);

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.status).toBe(DeliveryStatus.OUT_FOR_DELIVERY);
    });

    it('should return the delivery address snapshot', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(trackingDelivery);

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
      prismaMock.delivery.findUnique.mockResolvedValue(trackingDelivery);

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.rider).toEqual({
        id: riderId,
        name: 'Rider One',
        phone: '8888888888',
        vehicleType: 'BIKE',
        vehicleNumber: 'UP16AB1234',
      });
    });

    it('should return delivery timestamps', async () => {
      prismaMock.delivery.findUnique.mockResolvedValue(trackingDelivery);

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.timestamps).toEqual({
        createdAt: trackingDelivery.createdAt,
        updatedAt: trackingDelivery.updatedAt,
      });
    });

    it('should return the rider GPS location when a location is available', async () => {
      const recordedAt = new Date(Date.now() - 10_000);
      const receivedAt = new Date(Date.now() - 5_000);

      prismaMock.delivery.findUnique.mockResolvedValue({
        ...trackingDelivery,
        riderLatitude: 28.5355,
        riderLongitude: 77.391,
        riderLocationAccuracyMeters: 12,
        riderLocationRecordedAt: recordedAt,
        riderLocationReceivedAt: receivedAt,
      });

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.riderLocation).toEqual({
        latitude: 28.5355,
        longitude: 77.391,
        accuracyMeters: 12,
        recordedAt: recordedAt.toISOString(),
        receivedAt: receivedAt.toISOString(),
        isStale: false,
      });
    });

    it('should mark the rider GPS location as stale when it is older than 60 seconds', async () => {
      const recordedAt = new Date(Date.now() - 120_000);
      const receivedAt = new Date(Date.now() - 90_000);

      prismaMock.delivery.findUnique.mockResolvedValue({
        ...trackingDelivery,
        riderLatitude: 28.5355,
        riderLongitude: 77.391,
        riderLocationAccuracyMeters: 25,
        riderLocationRecordedAt: recordedAt,
        riderLocationReceivedAt: receivedAt,
      });

      const result = await service.getCustomerTracking(
        deliveryId,
        customerId,
      );

      expect(result.riderLocation).toEqual({
        latitude: 28.5355,
        longitude: 77.391,
        accuracyMeters: 25,
        recordedAt: recordedAt.toISOString(),
        receivedAt: receivedAt.toISOString(),
        isStale: true,
      });
    });

  });


describe('getDeliveryRoute', () => {
  const freshDelivery = {
    id: deliveryId,
    riderLatitude: 28.5355,
    riderLongitude: 77.391,
    riderLocationReceivedAt: new Date(),
    order: {
      customerId,
      deliveryLatitude: 28.4595,
      deliveryLongitude: 77.0266,
    },
  };

  const mockRoutesResponse = {
    routes: [
      {
        distanceMeters: 12500,
        duration: '1200s',
        polyline: {
          encodedPolyline: 'test_encoded_polyline',
        },
      },
    ],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should reject when delivery does not exist', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue(null);

    await expect(
      service.getDeliveryRoute(deliveryId, customerId),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject access by another customer', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue({
      ...freshDelivery,
      order: {
        ...freshDelivery.order,
        customerId: 'another-customer',
      },
    });

    await expect(
      service.getDeliveryRoute(deliveryId, customerId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return unavailable when rider coordinates are missing', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue({
      ...freshDelivery,
      riderLatitude: null,
    });

    await expect(
      service.getDeliveryRoute(deliveryId, customerId),
    ).resolves.toMatchObject({
      available: false,
      reason: 'LOCATION_UNAVAILABLE',
      route: null,
    });
  });

  it('should return unavailable when rider location is stale', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue({
      ...freshDelivery,
      riderLocationReceivedAt: new Date(Date.now() - 120_000),
    });

    await expect(
      service.getDeliveryRoute(deliveryId, customerId),
    ).resolves.toMatchObject({
      available: false,
      reason: 'RIDER_LOCATION_STALE',
      route: null,
    });
  });

  it('should return unavailable when the Routes API key is missing', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue(freshDelivery);
    configServiceMock.get.mockReturnValue(undefined);

    await expect(
      service.getDeliveryRoute(deliveryId, customerId),
    ).resolves.toMatchObject({
      available: false,
      reason: 'ROUTES_API_NOT_CONFIGURED',
      route: null,
    });
  });

  it('should return road distance, duration and polyline on success', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue(freshDelivery);
    configServiceMock.get.mockReturnValue('test-api-key');

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(mockRoutesResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await service.getDeliveryRoute(
      deliveryId,
      customerId,
    );

    expect(result.available).toBe(true);
    expect(result.route).toMatchObject({
      distanceMeters: 12500,
      distanceKm: 12.5,
      durationSeconds: 1200,
      durationMinutes: 20,
      encodedPolyline: 'test_encoded_polyline',
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should gracefully handle a Routes API error', async () => {
    prismaMock.delivery.findUnique.mockResolvedValue(freshDelivery);
    configServiceMock.get.mockReturnValue('test-api-key');

    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Provider error', { status: 500 }),
    );

    await expect(
      service.getDeliveryRoute(deliveryId, customerId),
    ).resolves.toMatchObject({
      available: false,
      reason: 'ROUTE_PROVIDER_UNAVAILABLE',
      route: null,
    });
  });
});

});
