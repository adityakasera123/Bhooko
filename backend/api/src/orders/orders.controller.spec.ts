import { jest } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('OrdersController', () => {
  let controller: OrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
       {
  provide: OrdersService,
  useValue: {
    cancelOrder: jest.fn(),
  },
},
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

    it('should cancel an order for the authenticated customer', async () => {
    const ordersServiceMock =
  controller['ordersService'] as any;``

   const cancelOrderMock: any = jest.fn();

cancelOrderMock.mockResolvedValue({
  id: 'order-1',
  status: 'CANCELLED',
});

ordersServiceMock.cancelOrder = cancelOrderMock;

    const user = {
      userId: 'customer-1',
      role: 'CUSTOMER',
    };

    const result = await controller.cancelOrder(
      user,
      'order-1',
    );

    expect(
      ordersServiceMock.cancelOrder,
    ).toHaveBeenCalledWith(
      'customer-1',
      'order-1',
    );

    expect(result).toEqual({
      id: 'order-1',
      status: 'CANCELLED',
    });
  });
});