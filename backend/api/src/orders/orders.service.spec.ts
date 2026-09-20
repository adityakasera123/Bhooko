import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';

import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prismaMock: any = {
    $transaction: jest.fn(),
  };

  const pricingServiceMock: any = {
    calculate: jest.fn(),
  };

const mockResolved = (value: any): any => {
  const fn: any = jest.fn();
  fn.mockResolvedValue(value);
  return fn;
};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          OrdersService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
          {
            provide: PricingService,
            useValue: pricingServiceMock,
          },
        ],
      }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw when delivery address is not found', async () => {
    const tx: any = {
      customerAddress: {
        findFirst: mockResolved(null),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    await expect(
      service.createOrder('customer-1', {
        addressId: 'address-1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      tx.customerAddress.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 'address-1',
        customerId: 'customer-1',
      },
    });
  });

  it('should throw when cart is empty', async () => {
    const tx: any = {
      customerAddress: {
        findFirst: mockResolved({
          id: 'address-1',
        }),
      },
      cart: {
        findUnique: mockResolved({
          id: 'cart-1',
          items: [],
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    await expect(
      service.createOrder('customer-1', {
        addressId: 'address-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.cart.findUnique).toHaveBeenCalled();
  });

  it('should create an order using PricingService', async () => {
    const tx: any = {
      customerAddress: {
        findFirst: mockResolved({
          id: 'address-1',
          label: 'Home',
          contactName: 'Test Customer',
          contactPhone: '+919999999991',
          line1: '123 Test Street',
          line2: null,
          area: 'Sector 62',
          city: 'Noida',
          state: 'Uttar Pradesh',
          pincode: '201301',
          latitude: 28.6139,
          longitude: 77.209,
          deliveryInstructions: null,
        }),
      },

      cart: {
        findUnique: mockResolved({
          id: 'cart-1',
          items: [
            {
              id: 'cart-item-1',
              quantity: 2,
              foodItem: {
                id: 'food-1',
                name: 'Chicken Biryani',
                priceInPaise: 18000,
                isAvailable: true,
                restaurantId: 'restaurant-1',
                restaurant: {
                  id: 'restaurant-1',
                  name: 'Bhooko Kitchen',
                },
              },
            },
          ],
        }),
      },

      order: {
        create: mockResolved({
          id: 'order-1',
          totalInPaise: 36000,
          items: [
            {
              id: 'order-item-1',
            },
          ],
        }),
      },

      cartItem: {
        deleteMany: mockResolved({
          count: 1,
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    pricingServiceMock.calculate.mockReturnValue({
      itemSubtotalInPaise: 36000,
      deliveryFeeInPaise: 0,
      platformFeeInPaise: 0,
      taxInPaise: 0,
      discountInPaise: 0,
      totalInPaise: 36000,
    });

    const result = await service.createOrder(
      'customer-1',
      {
        addressId: 'address-1',
      },
    );

    expect(
      pricingServiceMock.calculate,
    ).toHaveBeenCalledTimes(1);

    expect(
      pricingServiceMock.calculate,
    ).toHaveBeenCalledWith({
      itemSubtotalInPaise: 36000,
    });

    expect(tx.order.create).toHaveBeenCalledTimes(1);

    expect(tx.order.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: 'CREATED',
        restaurantName: 'Bhooko Kitchen',

        itemSubtotalInPaise: 36000,
        deliveryFeeInPaise: 0,
        platformFeeInPaise: 0,
        taxInPaise: 0,
        discountInPaise: 0,
        totalInPaise: 36000,

        items: {
          create: [
            {
              foodItemId: 'food-1',
              foodItemName: 'Chicken Biryani',
              unitPriceInPaise: 18000,
              quantity: 2,
              itemSubtotalInPaise: 36000,
            },
          ],
        },
      }),
      include: {
        items: true,
      },
    });

    expect(
      tx.cartItem.deleteMany,
    ).toHaveBeenCalledWith({
      where: {
        cartId: 'cart-1',
      },
    });

    expect(result).toEqual({
      message: 'Order created successfully',
      orderCount: 1,
      orders: [
        {
          id: 'order-1',
          totalInPaise: 36000,
          items: [
            {
              id: 'order-item-1',
            },
          ],
        },
      ],
    });
  });

  it('should throw when food item is unavailable', async () => {
    const tx: any = {
      customerAddress: {
        findFirst: mockResolved({
          id: 'address-1',
        }),
      },

      cart: {
        findUnique: mockResolved({
          id: 'cart-1',
          items: [
            {
              id: 'cart-item-1',
              quantity: 1,
              foodItem: {
                id: 'food-1',
                name: 'Chicken Biryani',
                priceInPaise: 18000,
                isAvailable: false,
                restaurantId: 'restaurant-1',
                restaurant: {
                  id: 'restaurant-1',
                  name: 'Bhooko Kitchen',
                },
              },
            },
          ],
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    await expect(
      service.createOrder('customer-1', {
        addressId: 'address-1',
      }),
    ).rejects.toThrow(
      'Food item "Chicken Biryani" is not available',
    );

    expect(
      pricingServiceMock.calculate,
    ).not.toHaveBeenCalled();
  });

  it('should throw when cart quantity is invalid', async () => {
    const tx: any = {
      customerAddress: {
        findFirst: mockResolved({
          id: 'address-1',
        }),
      },

      cart: {
        findUnique: mockResolved({
          id: 'cart-1',
          items: [
            {
              id: 'cart-item-1',
              quantity: 21,
              foodItem: {
                id: 'food-1',
                name: 'Chicken Biryani',
                priceInPaise: 18000,
                isAvailable: true,
                restaurantId: 'restaurant-1',
                restaurant: {
                  id: 'restaurant-1',
                  name: 'Bhooko Kitchen',
                },
              },
            },
          ],
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    await expect(
      service.createOrder('customer-1', {
        addressId: 'address-1',
      }),
    ).rejects.toThrow(
      'Invalid quantity for food item "Chicken Biryani"',
    );

    expect(
      pricingServiceMock.calculate,
    ).not.toHaveBeenCalled();
  });

  it('should throw when food item has an invalid restaurant relationship', async () => {
    const tx: any = {
      customerAddress: {
        findFirst: mockResolved({
          id: 'address-1',
        }),
      },

      cart: {
        findUnique: mockResolved({
          id: 'cart-1',
          items: [
            {
              id: 'cart-item-1',
              quantity: 1,
              foodItem: {
                id: 'food-1',
                name: 'Chicken Biryani',
                priceInPaise: 18000,
                isAvailable: true,
                restaurantId: 'restaurant-1',
                restaurant: {
                  id: 'restaurant-2',
                  name: 'Wrong Restaurant',
                },
              },
            },
          ],
        }),
      },
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(tx),
    );

    await expect(
      service.createOrder('customer-1', {
        addressId: 'address-1',
      }),
    ).rejects.toThrow(
      'Food item "Chicken Biryani" has an invalid restaurant relationship',
    );

    expect(
      pricingServiceMock.calculate,
    ).not.toHaveBeenCalled();
  });
});