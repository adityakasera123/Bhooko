import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';

import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';
import {
  UpdateOrderStatus,
  UpdateOrderStatusDto,
} from './dto/update-order-status.dto';
import { OrderStateMachineService } from './order-state-machine.service';

describe('OrdersService', () => {
  let service: OrdersService;

  const prismaMock: any = {
    $transaction: jest.fn(),
  };

  const pricingServiceMock: any = {
    calculate: jest.fn(),
  };

  const orderStateMachineMock: any = {
    assertTransitionAllowed: jest.fn(),
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
          {
            provide: OrderStateMachineService,
            useValue: orderStateMachineMock,
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

  it(
    'should throw when food item has an invalid restaurant relationship',
    async () => {
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
    },
  );

  it('should allow restaurant owner to update its order status', async () => {
    const order = {
      id: 'order-1',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      status: 'CREATED',
    };

    prismaMock.order = {
      findUnique: mockResolved(order),
      update: mockResolved({
        ...order,
        status: 'CONFIRMED',
      }),
    };

    prismaMock.restaurant = {
      findUnique: mockResolved({
        id: 'restaurant-1',
        ownerId: 'restaurant-owner-1',
      }),
    };

    await service.updateOrderStatus(
      'restaurant-owner-1',
      'RESTAURANT',
      'order-1',
      {
  status: UpdateOrderStatus.CONFIRMED,
} satisfies UpdateOrderStatusDto
    );

    expect(
      prismaMock.restaurant.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        id: 'restaurant-1',
      },
    });

    expect(
      orderStateMachineMock.assertTransitionAllowed,
    ).toHaveBeenCalledWith(
      'CREATED',
      'CONFIRMED',
    );

    expect(
      prismaMock.order.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'order-1',
      },
      data: {
        status: 'CONFIRMED',
      },
    });
  });

  it('should reject customer from updating order status', async () => {
    prismaMock.order = {
      findUnique: mockResolved({
        id: 'order-1',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: 'CREATED',
      }),
    };

    await expect(
      service.updateOrderStatus(
        'customer-1',
        'CUSTOMER',
        'order-1',
        {
          status: UpdateOrderStatus.CONFIRMED,
        } satisfies UpdateOrderStatusDto,
      ),
    ).rejects.toThrow(
      'Customers are not allowed to update order status',
    );

  });

  it('should reject restaurant owner from updating another restaurant order', async () => {
    prismaMock.order = {
      findUnique: mockResolved({
        id: 'order-2',
        customerId: 'customer-1',
        restaurantId: 'restaurant-2',
        status: 'CREATED',
      }),
    };

    prismaMock.restaurant = {
      findUnique: mockResolved({
        id: 'restaurant-2',
        ownerId: 'restaurant-owner-2',
      }),
    };

    await expect(
      service.updateOrderStatus(
        'restaurant-owner-1',
        'RESTAURANT',
        'order-2',
        {
          status: UpdateOrderStatus.CONFIRMED,
        } satisfies UpdateOrderStatusDto,
      ),
    ).rejects.toThrow(
      'You are not allowed to update this restaurant order',
    );

  });

  it('should reject an invalid order status transition', async () => {
    prismaMock.order = {
      findUnique: mockResolved({
        id: 'order-3',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: 'CREATED',
      }),
      update: jest.fn(),
    };

    prismaMock.restaurant = {
      findUnique: mockResolved({
        id: 'restaurant-1',
        ownerId: 'restaurant-owner-1',
      }),
    };

    orderStateMachineMock.assertTransitionAllowed.mockImplementation(
      () => {
        throw new ForbiddenException(
          'Order cannot move from CREATED to PREPARING',
        );
      },
    );

    await expect(
      service.updateOrderStatus(
        'restaurant-owner-1',
        'RESTAURANT',
        'order-3',
        {
          status: UpdateOrderStatus.PREPARING,
        } satisfies UpdateOrderStatusDto,
      ),
    ).rejects.toThrow(
      'Order cannot move from CREATED to PREPARING',
    );

    expect(
      orderStateMachineMock.assertTransitionAllowed,
    ).toHaveBeenCalledWith(
      'CREATED',
      UpdateOrderStatus.PREPARING,
    );

    expect(
      prismaMock.order.update,
    ).not.toHaveBeenCalled();
  });

  it('should allow customer to cancel an order in CREATED status', async () => {
  orderStateMachineMock.assertTransitionAllowed.mockImplementation(
    () => undefined,
  );

  prismaMock.order = {
    findFirst: mockResolved({
      id: 'order-4',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      status: 'CREATED',
    }),
    update: mockResolved({
      id: 'order-4',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      status: 'CANCELLED',
    }),
  };

  await service.cancelOrder('customer-1', 'order-4');

  expect(
    orderStateMachineMock.assertTransitionAllowed,
  ).toHaveBeenCalledWith(
    'CREATED',
    'CANCELLED',
  );

  expect(
    prismaMock.order.update,
  ).toHaveBeenCalledWith({
    where: {
      id: 'order-4',
    },
    data: {
      status: 'CANCELLED',
    },
  });
  });

  it('should reject customer from cancelling another customer order', async () => {
    orderStateMachineMock.assertTransitionAllowed.mockImplementation(
      () => undefined,
    );

    prismaMock.order = {
      findFirst: mockResolved(null),
      update: jest.fn(),
    };

    await expect(
      service.cancelOrder('customer-2', 'order-4'),
    ).rejects.toThrow('Order not found');

    expect(
      orderStateMachineMock.assertTransitionAllowed,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.order.update,
    ).not.toHaveBeenCalled();
  });

    it('should reject customer from cancelling an order after preparation has started', async () => {
    orderStateMachineMock.assertTransitionAllowed.mockImplementation(
      () => {
        throw new ForbiddenException(
          'Order cannot move from PREPARING to CANCELLED',
        );
      },
    );

    prismaMock.order = {
      findFirst: mockResolved({
        id: 'order-5',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: 'PREPARING',
      }),
      update: jest.fn(),
    };

    await expect(
      service.cancelOrder('customer-1', 'order-5'),
    ).rejects.toThrow(
      'Order cannot move from PREPARING to CANCELLED',
    );

    expect(
      orderStateMachineMock.assertTransitionAllowed,
    ).toHaveBeenCalledWith(
      'PREPARING',
      'CANCELLED',
    );

    expect(
      prismaMock.order.update,
    ).not.toHaveBeenCalled();
  });
});