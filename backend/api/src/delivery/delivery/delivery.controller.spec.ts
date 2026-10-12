
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

type MockFn = jest.MockedFunction<any>;

describe('DeliveryController', () => {
  let controller: DeliveryController;

  const deliveryServiceMock = {
    getCustomerTracking: jest.fn() as MockFn,
    updateRiderLocation: jest.fn() as MockFn,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliveryController],
      providers: [
        {
          provide: DeliveryService,
          useValue: deliveryServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<DeliveryController>(
      DeliveryController,
    );
  });

  describe('getCustomerTracking', () => {
    it('should return customer delivery tracking', async () => {
      const deliveryId = 'delivery-1';
      const customerId = 'customer-1';

      const tracking = {
        deliveryId,
        orderId: 'order-1',
        status: 'OUT_FOR_DELIVERY',
        rider: {
          id: 'rider-1',
          name: 'Rider One',
          phone: '9999999999',
          vehicleType: 'BIKE',
          vehicleNumber: 'UPXX1234',
        },
      };

      deliveryServiceMock.getCustomerTracking.mockResolvedValue(
        tracking,
      );

      const req = {
        user: {
          userId: customerId,
        },
      };

      const result = await controller.getCustomerTracking(
        deliveryId,
        req,
      );

      expect(result).toEqual(tracking);

      expect(
        deliveryServiceMock.getCustomerTracking,
      ).toHaveBeenCalledWith(deliveryId, customerId);

      expect(
        deliveryServiceMock.getCustomerTracking,
      ).toHaveBeenCalledTimes(1);
    });

    it('should pass the authenticated customer id to the service', async () => {
      const req = {
        user: {
          userId: 'customer-123',
        },
      };

      deliveryServiceMock.getCustomerTracking.mockResolvedValue({
        deliveryId: 'delivery-123',
      });

      await controller.getCustomerTracking(
        'delivery-123',
        req,
      );

      expect(
        deliveryServiceMock.getCustomerTracking,
      ).toHaveBeenCalledWith(
        'delivery-123',
        'customer-123',
      );
    });

    it('should propagate service errors', async () => {
      const error = new Error(
        'You are not authorized to access this delivery',
      );

      deliveryServiceMock.getCustomerTracking.mockRejectedValue(
        error,
      );

      const req = {
        user: {
          userId: 'customer-1',
        },
      };

      await expect(
        controller.getCustomerTracking(
          'delivery-1',
          req,
        ),
      ).rejects.toThrow(error);

      expect(
        deliveryServiceMock.getCustomerTracking,
      ).toHaveBeenCalledWith(
        'delivery-1',
        'customer-1',
      );
    });
  });
});
