import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import { CheckoutService } from './checkout.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

describe('CheckoutService', () => {
  let service: CheckoutService;

  const prismaMock: any = {
    customerAddress: {
      findFirst: jest.fn(),
    },
    cart: {
      findUnique: jest.fn(),
    },
  };

  const pricingServiceMock: any = {
    calculate: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
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

    service = module.get<CheckoutService>(CheckoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw when delivery address is not found', async () => {
    prismaMock.customerAddress.findFirst.mockResolvedValue(null);

    await expect(
      service.preview(
        'customer-1',
        'address-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(
      prismaMock.customerAddress.findFirst,
    ).toHaveBeenCalledWith({
      where: {
        id: 'address-1',
        customerId: 'customer-1',
      },
    });
  });

  it('should throw when cart is empty', async () => {
    prismaMock.customerAddress.findFirst.mockResolvedValue({
      id: 'address-1',
    });

    prismaMock.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [],
    });

    await expect(
      service.preview(
        'customer-1',
        'address-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('should calculate checkout preview for a valid cart', async () => {
    prismaMock.customerAddress.findFirst.mockResolvedValue({
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
      deliveryInstructions: null,
    });

    prismaMock.cart.findUnique.mockResolvedValue({
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
    });

    pricingServiceMock.calculate.mockReturnValue({
      itemSubtotalInPaise: 36000,
      deliveryFeeInPaise: 0,
      platformFeeInPaise: 0,
      taxInPaise: 0,
      discountInPaise: 0,
      totalInPaise: 36000,
    });

    const result = await service.preview(
      'customer-1',
      'address-1',
    );

    expect(
      pricingServiceMock.calculate,
    ).toHaveBeenCalledWith({
      itemSubtotalInPaise: 36000,
    });

    expect(result.grandTotalInPaise).toBe(36000);
    expect(result.currency).toBe('INR');
    expect(result.restaurants).toHaveLength(1);
    expect(result.restaurants[0].restaurantId).toBe(
      'restaurant-1',
    );
    expect(result.restaurants[0].items).toHaveLength(1);
  });

  it('should throw when a food item is unavailable', async () => {
    prismaMock.customerAddress.findFirst.mockResolvedValue({
      id: 'address-1',
    });

    prismaMock.cart.findUnique.mockResolvedValue({
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
    });

    await expect(
      service.preview(
        'customer-1',
        'address-1',
      ),
    ).rejects.toThrow(
      'Food item "Chicken Biryani" is not available',
    );
  });

  it('should throw when cart quantity is invalid', async () => {
    prismaMock.customerAddress.findFirst.mockResolvedValue({
      id: 'address-1',
    });

    prismaMock.cart.findUnique.mockResolvedValue({
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
    });

    await expect(
      service.preview(
        'customer-1',
        'address-1',
      ),
    ).rejects.toThrow(
      'Invalid quantity for food item "Chicken Biryani"',
    );
  });
});