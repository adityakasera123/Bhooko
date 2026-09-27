import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

type MockFn = jest.MockedFunction<any>;

describe('DeliveryController', () => {
  let controller: DeliveryController;

  const deliveryServiceMock = {
  createDelivery: jest.fn() as MockFn,
  getCustomerTracking: jest.fn() as MockFn,
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

    controller = module.get<DeliveryController>(DeliveryController);
  });

  describe('createDelivery', () => {
    it('should create a delivery for the given order', async () => {
      const dto: CreateDeliveryDto = {
        orderId: 'order-1',
      };

      const delivery = {
        id: 'delivery-1',
        orderId: 'order-1',
        status: 'CREATED',
      };

      deliveryServiceMock.createDelivery.mockResolvedValue(delivery);

      const result = await controller.createDelivery(dto);

      expect(result).toEqual(delivery);

      expect(
        deliveryServiceMock.createDelivery,
      ).toHaveBeenCalledWith(dto.orderId);

      expect(
        deliveryServiceMock.createDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should pass the orderId from the DTO to the service', async () => {
      const dto: CreateDeliveryDto = {
        orderId: 'order-123',
      };

      const delivery = {
        id: 'delivery-123',
        orderId: 'order-123',
        status: 'CREATED',
      };

      deliveryServiceMock.createDelivery.mockResolvedValue(delivery);

      await controller.createDelivery(dto);

      expect(
        deliveryServiceMock.createDelivery,
      ).toHaveBeenCalledWith('order-123');

      expect(
        deliveryServiceMock.createDelivery,
      ).toHaveBeenCalledTimes(1);
    });

    it('should propagate service errors', async () => {
      const dto: CreateDeliveryDto = {
        orderId: 'order-1',
      };

      const error = new Error('Delivery creation failed');

      deliveryServiceMock.createDelivery.mockRejectedValue(error);

      await expect(
        controller.createDelivery(dto),
      ).rejects.toThrow(error);

      expect(
        deliveryServiceMock.createDelivery,
      ).toHaveBeenCalledWith(dto.orderId);
    });
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
    ).toHaveBeenCalledWith(
      deliveryId,
      customerId,
    );

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