import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const prismaMock = {
    $transaction: jest.fn(),
    order: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    paymentTransaction: {
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const razorpayServiceMock = {
    createOrder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: RazorpayService,
          useValue: razorpayServiceMock,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });



  it('should reuse the same pending payment transaction for multiple linked orders', async () => {
    const userId = 'customer-1';
    const orderId1 = 'order-1';
    const orderId2 = 'order-2';

    const existingPayment = {
      id: 'payment-1',
      customerId: userId,
      status: 'PENDING',
      amountInPaise: 36000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
    };

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prismaMock) => Promise<unknown>,
      ) => callback(prismaMock),
    );

    prismaMock.order.findMany.mockResolvedValue([
      {
        id: orderId1,
        customerId: userId,
        paymentTransactionId: existingPayment.id,
        totalInPaise: 18000,
        status: 'CREATED',
        paymentTransaction: existingPayment,
      },
      {
        id: orderId2,
        customerId: userId,
        paymentTransactionId: existingPayment.id,
        totalInPaise: 18000,
        status: 'CREATED',
        paymentTransaction: existingPayment,
      },
    ]);

    const result = await service.createPayment(
      userId,
      [orderId1, orderId2],
    );

    expect(result).toEqual({
      type: 'existing',
      paymentTransactionId: 'payment-1',
      razorpayOrderId: 'order_test_123',
      amountInPaise: 36000,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      orderIds: [orderId1, orderId2],
    });

    expect(prismaMock.paymentTransaction.create).not.toHaveBeenCalled();
    expect(razorpayServiceMock.createOrder).not.toHaveBeenCalled();
  });

  it('should reject an order linked to a non-pending payment transaction', async () => {
    const userId = 'customer-1';
    const orderId = 'order-1';

    const existingPayment = {
      id: 'payment-1',
      customerId: userId,
      status: 'FAILED',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
    };

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prismaMock) => Promise<unknown>,
      ) => callback(prismaMock),
    );

    prismaMock.order.findMany.mockResolvedValue([
      {
        id: orderId,
        customerId: userId,
        paymentTransactionId: existingPayment.id,
        totalInPaise: 18000,
        status: 'CREATED',
        paymentTransaction: existingPayment,
      },
    ]);

    await expect(
      service.createPayment(userId, [orderId]),
    ).rejects.toThrow(
      'One or more orders are already linked to a payment transaction',
    );

    expect(prismaMock.paymentTransaction.create).not.toHaveBeenCalled();
    expect(razorpayServiceMock.createOrder).not.toHaveBeenCalled();
  });

  it('should reuse an existing pending payment transaction', async () => {
    const userId = 'customer-1';
    const orderId = 'order-1';

    const existingPayment = {
      id: 'payment-1',
      customerId: userId,
      status: 'PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
    };

    prismaMock.$transaction.mockImplementation(
      async (
        callback: (tx: typeof prismaMock) => Promise<unknown>,
      ) => callback(prismaMock),
    );

    prismaMock.order.findMany.mockResolvedValue([
      {
        id: orderId,
        customerId: userId,
        paymentTransactionId: existingPayment.id,
        totalInPaise: 18000,
        status: 'CREATED',
        paymentTransaction: existingPayment,
      },
    ]);

    const result = await service.createPayment(userId, [orderId]);

    expect(result).toEqual({
      type: 'existing',
      paymentTransactionId: 'payment-1',
      razorpayOrderId: 'order_test_123',
      amountInPaise: 18000,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      orderIds: [orderId],
    });

    expect(prismaMock.paymentTransaction.create).not.toHaveBeenCalled();
    expect(razorpayServiceMock.createOrder).not.toHaveBeenCalled();
  });
});
