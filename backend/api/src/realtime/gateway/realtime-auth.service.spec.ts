import { jest } from '@jest/globals';
import { UserRole } from '@prisma/client';

import { RealtimeAuthService } from './realtime-auth.service';

describe('RealtimeAuthService', () => {
  let service: RealtimeAuthService;

  type OrderAuthRecord = {
  customerId: string;
  restaurantId: string;
};

type DeliveryAuthRecord = {
  riderId: string | null;
  order: {
    customerId: string;
    restaurantId: string;
  };
};

type RiderAuthRecord = {
  userId: string;
};

type RestaurantAuthRecord = {
  ownerId: string;
};

const prisma = {
  order: {
    findUnique: jest.fn<
      (
        args: unknown,
      ) => Promise<OrderAuthRecord | null>
    >(),
  },

  delivery: {
    findUnique: jest.fn<
      (
        args: unknown,
      ) => Promise<DeliveryAuthRecord | null>
    >(),
  },

  rider: {
    findUnique: jest.fn<
      (
        args: unknown,
      ) => Promise<RiderAuthRecord | null>
    >(),
  },

  restaurant: {
    findUnique: jest.fn<
      (
        args: unknown,
      ) => Promise<RestaurantAuthRecord | null>
    >(),
  },
};

  beforeEach(() => {
    jest.clearAllMocks();

    service = new RealtimeAuthService(
      prisma as any,
    );
  });

  describe('canJoinOrder', () => {
    it('should allow the customer who owns the order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
      });

      await expect(
        service.canJoinOrder(
          'order-1',
          'customer-1',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(true);
    });

    it('should reject a customer who does not own the order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
      });

      await expect(
        service.canJoinOrder(
          'order-1',
          'customer-2',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(false);
    });

    it('should allow the restaurant associated with the order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
      });

      await expect(
        service.canJoinOrder(
          'order-1',
          'restaurant-1',
          UserRole.RESTAURANT,
        ),
      ).resolves.toBe(true);
    });

    it('should reject unsupported roles', async () => {
      prisma.order.findUnique.mockResolvedValue({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
      });

      await expect(
        service.canJoinOrder(
          'order-1',
          'admin-1',
          'ADMIN',
        ),
      ).resolves.toBe(false);
    });

    it('should reject a missing order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.canJoinOrder(
          'missing-order',
          'customer-1',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(false);
    });
  });

  describe('canJoinDelivery', () => {
    it('should allow the customer who owns the delivery order', async () => {
      prisma.delivery.findUnique.mockResolvedValue({
        riderId: 'rider-1',
        order: {
          customerId: 'customer-1',
          restaurantId: 'restaurant-1',
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

    it('should reject a different customer', async () => {
      prisma.delivery.findUnique.mockResolvedValue({
        riderId: 'rider-1',
        order: {
          customerId: 'customer-1',
          restaurantId: 'restaurant-1',
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

    it('should allow the restaurant associated with the delivery order', async () => {
      prisma.delivery.findUnique.mockResolvedValue({
        riderId: 'rider-1',
        order: {
          customerId: 'customer-1',
          restaurantId: 'restaurant-1',
        },
      });

      await expect(
        service.canJoinDelivery(
          'delivery-1',
          'restaurant-1',
          UserRole.RESTAURANT,
        ),
      ).resolves.toBe(true);
    });

    it('should allow the rider assigned to the delivery', async () => {
      prisma.delivery.findUnique.mockResolvedValue({
        riderId: 'rider-1',
        order: {
          customerId: 'customer-1',
          restaurantId: 'restaurant-1',
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
        riderId: 'rider-1',
        order: {
          customerId: 'customer-1',
          restaurantId: 'restaurant-1',
        },
      });

      prisma.rider.findUnique.mockResolvedValue({
        userId: 'different-user',
      });

      await expect(
        service.canJoinDelivery(
          'delivery-1',
          'rider-user-1',
          UserRole.DELIVERY_PARTNER,
        ),
      ).resolves.toBe(false);
    });

    it('should reject a rider when no rider is assigned', async () => {
      prisma.delivery.findUnique.mockResolvedValue({
        riderId: null,
        order: {
          customerId: 'customer-1',
          restaurantId: 'restaurant-1',
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

    it('should reject a missing delivery', async () => {
      prisma.delivery.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.canJoinDelivery(
          'missing-delivery',
          'customer-1',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(false);
    });
  });

  describe('canJoinRestaurant', () => {
    it('should allow the restaurant owner', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        ownerId: 'restaurant-owner-1',
      });

      await expect(
        service.canJoinRestaurant(
          'restaurant-1',
          'restaurant-owner-1',
          UserRole.RESTAURANT,
        ),
      ).resolves.toBe(true);
    });

    it('should reject a different restaurant owner', async () => {
      prisma.restaurant.findUnique.mockResolvedValue({
        ownerId: 'restaurant-owner-1',
      });

      await expect(
        service.canJoinRestaurant(
          'restaurant-1',
          'restaurant-owner-2',
          UserRole.RESTAURANT,
        ),
      ).resolves.toBe(false);
    });

    it('should reject non-restaurant roles', async () => {
      await expect(
        service.canJoinRestaurant(
          'restaurant-1',
          'customer-1',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(false);

      expect(
        prisma.restaurant.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('should reject a missing restaurant', async () => {
      prisma.restaurant.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.canJoinRestaurant(
          'restaurant-1',
          'restaurant-owner-1',
          UserRole.RESTAURANT,
        ),
      ).resolves.toBe(false);
    });
  });

  describe('canJoinRider', () => {
    it('should allow the rider who owns the rider profile', async () => {
      prisma.rider.findUnique.mockResolvedValue({
        userId: 'rider-user-1',
      });

      await expect(
        service.canJoinRider(
          'rider-1',
          'rider-user-1',
          UserRole.DELIVERY_PARTNER,
        ),
      ).resolves.toBe(true);
    });

    it('should reject a different rider user', async () => {
      prisma.rider.findUnique.mockResolvedValue({
        userId: 'rider-user-1',
      });

      await expect(
        service.canJoinRider(
          'rider-1',
          'rider-user-2',
          UserRole.DELIVERY_PARTNER,
        ),
      ).resolves.toBe(false);
    });

    it('should reject non-rider roles', async () => {
      await expect(
        service.canJoinRider(
          'rider-1',
          'customer-1',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(false);

      expect(
        prisma.rider.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('should reject a missing rider', async () => {
      prisma.rider.findUnique.mockResolvedValue(null);

      await expect(
        service.canJoinRider(
          'rider-1',
          'rider-user-1',
          UserRole.DELIVERY_PARTNER,
        ),
      ).resolves.toBe(false);
    });
  });

  describe('canJoinCustomer', () => {
    it('should allow the customer to join their own room', async () => {
      await expect(
        service.canJoinCustomer(
          'customer-1',
          'customer-1',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(true);
    });

    it('should reject another customer', async () => {
      await expect(
        service.canJoinCustomer(
          'customer-1',
          'customer-2',
          UserRole.CUSTOMER,
        ),
      ).resolves.toBe(false);
    });

    it('should reject non-customer roles', async () => {
      await expect(
        service.canJoinCustomer(
          'customer-1',
          'rider-1',
          UserRole.DELIVERY_PARTNER,
        ),
      ).resolves.toBe(false);
    });
  });
});