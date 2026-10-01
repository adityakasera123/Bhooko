import { jest } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';

import { ServiceabilityService } from './serviceability.service';

describe('ServiceabilityService', () => {
  let service: ServiceabilityService;

  const prismaMock = {
  customerAddress: {
    findFirst: jest.fn<
      () => Promise<{
        id: string;
        latitude: number;
        longitude: number;
      } | null>
    >(),
  },
  restaurant: {
    findUnique: jest.fn<
      () => Promise<{
        id: string;
        latitude: number;
        longitude: number;
        deliveryRadiusKm: number;
      } | null>
    >(),
  },
};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceabilityService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ServiceabilityService>(ServiceabilityService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return serviceable when customer is within restaurant delivery radius', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-1',
    latitude: 25.0000,
    longitude: 82.0000,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue({
    id: 'restaurant-1',
    latitude: 25.0100,
    longitude: 82.0100,
    deliveryRadiusKm: 5,
  });

  const result = await service.getServiceabilityData(
    'customer-1',
    'address-1',
    'restaurant-1',
  );

  expect(result.serviceable).toBe(true);
  expect(result.restaurantId).toBe('restaurant-1');
  expect(result.distanceKm).toBeGreaterThan(0);
  expect(result.distanceKm).toBeLessThanOrEqual(5);
  expect(result.deliveryRadiusKm).toBe(5);
  expect(result.reason).toBeNull();
  });

  it('should return non-serviceable when customer is outside restaurant delivery radius', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-2',
    latitude: 25.0000,
    longitude: 82.0000,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue({
    id: 'restaurant-2',
    latitude: 25.1000,
    longitude: 82.1000,
    deliveryRadiusKm: 5,
  });

  const result = await service.getServiceabilityData(
    'customer-2',
    'address-2',
    'restaurant-2',
  );

  expect(result.serviceable).toBe(false);
  expect(result.restaurantId).toBe('restaurant-2');
  expect(result.distanceKm).toBeGreaterThan(5);
  expect(result.deliveryRadiusKm).toBe(5);
  expect(result.reason).toBe('OUTSIDE_SERVICE_AREA');
  });

  it('should reject when customer address does not belong to the customer', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue(null);

  await expect(
    service.getServiceabilityData(
      'customer-1',
      'address-not-owned',
      'restaurant-1',
    ),
  ).rejects.toThrow('Customer address not found');

  expect(prismaMock.restaurant.findUnique).not.toHaveBeenCalled();
  });

  it('should reject when restaurant does not exist', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-3',
    latitude: 25.0000,
    longitude: 82.0000,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue(null);

  await expect(
    service.getServiceabilityData(
      'customer-3',
      'address-3',
      'restaurant-not-found',
    ),
  ).rejects.toThrow('Restaurant not found');
  });

  it('should reject invalid customer latitude', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-invalid-lat',
    latitude: 95,
    longitude: 82,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue({
    id: 'restaurant-1',
    latitude: 25,
    longitude: 82,
    deliveryRadiusKm: 5,
  });

  await expect(
    service.getServiceabilityData(
      'customer-1',
      'address-invalid-lat',
      'restaurant-1',
    ),
  ).rejects.toThrow('Invalid customer location');
});

it('should reject invalid customer longitude', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-invalid-lng',
    latitude: 25,
    longitude: 185,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue({
    id: 'restaurant-1',
    latitude: 25,
    longitude: 82,
    deliveryRadiusKm: 5,
  });

  await expect(
    service.getServiceabilityData(
      'customer-1',
      'address-invalid-lng',
      'restaurant-1',
    ),
  ).rejects.toThrow('Invalid customer location');
});

it('should return serviceable when customer and restaurant are at the same location', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-same-location',
    latitude: 25,
    longitude: 82,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue({
    id: 'restaurant-same-location',
    latitude: 25,
    longitude: 82,
    deliveryRadiusKm: 5,
  });

  const result = await service.getServiceabilityData(
    'customer-1',
    'address-same-location',
    'restaurant-same-location',
  );

  expect(result.serviceable).toBe(true);
  expect(result.distanceKm).toBe(0);
  expect(result.reason).toBeNull();
});

it('should reject invalid restaurant location', async () => {
  prismaMock.customerAddress.findFirst.mockResolvedValue({
    id: 'address-4',
    latitude: 25.0000,
    longitude: 82.0000,
  });

  prismaMock.restaurant.findUnique.mockResolvedValue({
    id: 'restaurant-invalid-location',
    latitude: 95,
    longitude: 82,
    deliveryRadiusKm: 5,
  });

  await expect(
    service.getServiceabilityData(
      'customer-1',
      'address-4',
      'restaurant-invalid-location',
    ),
  ).rejects.toThrow('Invalid restaurant location');
});
});