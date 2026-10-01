import { jest } from '@jest/globals';

import { ServiceabilityController } from './serviceability.controller';
import { ServiceabilityService } from './serviceability.service';

describe('ServiceabilityController', () => {
  let controller: ServiceabilityController;

  const service = {
    getServiceabilityData: jest.fn<
      (
        customerId: string,
        addressId: string,
        restaurantId: string,
      ) => Promise<{
        serviceable: boolean;
        restaurantId: string;
        distanceKm: number;
        deliveryRadiusKm: number;
        reason: string | null;
      }>
    >(),
  };

  const user = {
    userId: 'customer-uuid',
    role: 'CUSTOMER',
  };

  beforeEach(() => {
    controller = new ServiceabilityController(
      service as unknown as ServiceabilityService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should pass authenticated user id, address id, and restaurant id to the service', async () => {
    const serviceabilityResult = {
      serviceable: true,
      restaurantId: 'restaurant-uuid',
      distanceKm: 2.35,
      deliveryRadiusKm: 5,
      reason: null,
    };

    service.getServiceabilityData.mockResolvedValue(
      serviceabilityResult,
    );

    const dto = {
      addressId: 'address-uuid',
      restaurantId: 'restaurant-uuid',
    };

    const result = await controller.checkServiceability(
      user,
      dto,
    );

    expect(
      service.getServiceabilityData,
    ).toHaveBeenCalledTimes(1);

    expect(
      service.getServiceabilityData,
    ).toHaveBeenCalledWith(
      'customer-uuid',
      'address-uuid',
      'restaurant-uuid',
    );

    expect(result).toEqual(serviceabilityResult);
  });

  it('should return a non-serviceable result from the service', async () => {
    const serviceabilityResult = {
      serviceable: false,
      restaurantId: 'restaurant-uuid',
      distanceKm: 7.42,
      deliveryRadiusKm: 5,
      reason: 'OUTSIDE_SERVICE_AREA',
    };

    service.getServiceabilityData.mockResolvedValue(
      serviceabilityResult,
    );

    const result = await controller.checkServiceability(
      user,
      {
        addressId: 'address-uuid',
        restaurantId: 'restaurant-uuid',
      },
    );

    expect(result).toEqual(serviceabilityResult);

    expect(
      service.getServiceabilityData,
    ).toHaveBeenCalledWith(
      'customer-uuid',
      'address-uuid',
      'restaurant-uuid',
    );
  });

  it('should propagate service errors', async () => {
    const error = new Error(
      'Customer address not found',
    );

    service.getServiceabilityData.mockRejectedValue(
      error,
    );

    await expect(
      controller.checkServiceability(
        user,
        {
          addressId: 'address-uuid',
          restaurantId: 'restaurant-uuid',
        },
      ),
    ).rejects.toThrow('Customer address not found');

    expect(
      service.getServiceabilityData,
    ).toHaveBeenCalledWith(
      'customer-uuid',
      'address-uuid',
      'restaurant-uuid',
    );
  });
});