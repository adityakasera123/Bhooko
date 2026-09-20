import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const prismaMock: any = {
    $transaction: jest.fn(),
    order: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
   paymentTransaction: {
  create: jest.fn(),
  update: jest.fn(),
  findFirst: jest.fn(),
},
  };

  const razorpayServiceMock: any = {
  createOrder: jest.fn(),
  createRefund: jest.fn(),
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
      async (callback: any) => callback(prismaMock),
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

    it('should initiate a refund and mark payment as REFUND_PENDING', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'PAID',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      orders: [
        {
          id: 'order-1',
          customerId: userId,
        },
      ],
    };

    const refund = {
      id: 'rfnd_test_123',
      status: 'pending',
    };

   prismaMock.paymentTransaction.findFirst.mockResolvedValue(
  paymentTransaction,
);

    razorpayServiceMock.createRefund.mockResolvedValue(refund);

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'REFUND_PENDING',
      refundId: refund.id,
      refundedAmountInPaise: 9000,
      refundReason: 'Missing item',
    });

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 9000,
        reason: 'Missing item',
      },
    );

    expect(
      razorpayServiceMock.createRefund,
    ).toHaveBeenCalledWith(
      'pay_test_123',
      9000,
      paymentTransactionId,
    );

    expect(
      prismaMock.paymentTransaction.update,
    ).toHaveBeenCalledWith({
      where: {
        id: paymentTransactionId,
      },
      data: {
        status: 'REFUND_PENDING',
        refundId: 'rfnd_test_123',
        refundedAmountInPaise: 9000,
        refundReason: 'Missing item',
      },
    });

    expect(result).toEqual({
      message: 'Refund initiated successfully',
      paymentTransactionId,
      refundId: 'rfnd_test_123',
      refundedAmountInPaise: 9000,
      status: 'REFUND_PENDING',
      orderIds: ['order-1'],
    });
  });

  it('should create a new payment transaction when the existing payment failed', async () => {
    const userId = 'customer-1';
    const orderId = 'order-1';

    const existingPayment = {
      id: 'payment-1',
      customerId: userId,
      status: 'FAILED',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_failed',
    };

    const newPayment = {
      id: 'payment-2',
      customerId: userId,
      status: 'CREATED',
      amountInPaise: 18000,
      currency: 'INR',
    };

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(prismaMock),
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

    prismaMock.paymentTransaction.create.mockResolvedValue(
      newPayment,
    );

    prismaMock.order.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });

    razorpayServiceMock.createOrder.mockResolvedValue({
      id: 'order_test_retry',
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...newPayment,
      razorpayOrderId: 'order_test_retry',
      status: 'PENDING',
    });

    const result = await service.createPayment(
      userId,
      [orderId],
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [orderId],
        },
        customerId: userId,
        paymentTransactionId: existingPayment.id,
      },
      data: {
        paymentTransactionId: null,
      },
    });

    expect(prismaMock.paymentTransaction.create).toHaveBeenCalled();

    expect(razorpayServiceMock.createOrder).toHaveBeenCalledWith(
      18000,
      'payment-2',
    );

    expect(result).toEqual({
      paymentTransactionId: 'payment-2',
      razorpayOrderId: 'order_test_retry',
      amountInPaise: 18000,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      orderIds: [orderId],
    });
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
      async (callback: any) => callback(prismaMock),
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

    const result = await service.createPayment(
      userId,
      [orderId],
    );

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