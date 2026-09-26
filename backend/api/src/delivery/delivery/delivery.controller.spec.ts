import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';

type MockFn = jest.MockedFunction<any>;

describe('DeliveryController', () => {
  let controller: DeliveryController;

  const deliveryServiceMock = {
    createDelivery: jest.fn() as MockFn,
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
    }).compile();

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
});