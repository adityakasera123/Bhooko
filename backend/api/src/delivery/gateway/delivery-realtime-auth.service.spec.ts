import { jest } from '@jest/globals';
import { UserRole } from '@prisma/client';


import { DeliveryRealtimeAuthService } from './delivery-realtime-auth.service';

describe('DeliveryRealtimeAuthService', () => {
  let service: DeliveryRealtimeAuthService;

 type DeliveryAuthRecord = {
  id: string;
  riderId: string | null;
  order: {
    customerId: string;
  };
};

type RiderAuthRecord = {
  userId: string;
};

const prisma = {
  delivery: {
    findUnique: jest.fn<
      (args: unknown) => Promise<DeliveryAuthRecord | null>
    >(),
  },
  rider: {
    findUnique: jest.fn<
      (args: unknown) => Promise<RiderAuthRecord | null>
    >(),
  },
};

  beforeEach(() => {
    jest.clearAllMocks();

    service = new DeliveryRealtimeAuthService(
      prisma as any,
    );
  });

  it('should allow the customer who owns the delivery', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      riderId: 'rider-1',
      order: {
        customerId: 'customer-1',
      },
    });

    await expect(
      service.canJoinDelivery(
        'delivery-1',
        'customer-1',
        UserRole.CUSTOMER,
      ),
    ).resolves.toBe(true);
  });

  it('should reject a customer who does not own the delivery', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      riderId: 'rider-1',
      order: {
        customerId: 'customer-1',
      },
    });

    await expect(
      service.canJoinDelivery(
        'delivery-1',
        'customer-2',
        UserRole.CUSTOMER,
      ),
    ).resolves.toBe(false);
  });

  it('should allow the rider assigned to the delivery', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      riderId: 'rider-1',
      order: {
        customerId: 'customer-1',
      },
    });

    prisma.rider.findUnique.mockResolvedValue({
      userId: 'rider-user-1',
    });

    await expect(
      service.canJoinDelivery(
        'delivery-1',
        'rider-user-1',
        UserRole.DELIVERY_PARTNER,
      ),
    ).resolves.toBe(true);
  });

  it('should reject a rider who is not assigned to the delivery', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      riderId: 'rider-1',
      order: {
        customerId: 'customer-1',
      },
    });

    prisma.rider.findUnique.mockResolvedValue({
      userId: 'different-rider-user',
    });

    await expect(
      service.canJoinDelivery(
        'delivery-1',
        'rider-user-1',
        UserRole.DELIVERY_PARTNER,
      ),
    ).resolves.toBe(false);
  });

  it('should reject a rider when the delivery has no rider', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      riderId: null,
      order: {
        customerId: 'customer-1',
      },
    });

    await expect(
      service.canJoinDelivery(
        'delivery-1',
        'rider-user-1',
        UserRole.DELIVERY_PARTNER,
      ),
    ).resolves.toBe(false);

    expect(
      prisma.rider.findUnique,
    ).not.toHaveBeenCalled();
  });

  it('should reject unsupported roles', async () => {
    prisma.delivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      riderId: 'rider-1',
      order: {
        customerId: 'customer-1',
      },
    });

    await expect(
      service.canJoinDelivery(
        'delivery-1',
        'admin-1',
        'ADMIN',
      ),
    ).resolves.toBe(false);
  });
});