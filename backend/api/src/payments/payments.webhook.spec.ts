
import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { PaymentsService } from './payments.service';

describe('PaymentsService Webhook', () => {
  let service: PaymentsService;

  const prismaMock: any = {
    $transaction: jest.fn(),
    paymentTransaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      updateMany: jest.fn(),
    },
  };

  const razorpayServiceMock: any = {
    createOrder: jest.fn(),
    createRefund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
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

  it('should mark payment as PAID and linked orders as CONFIRMED on payment.captured', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: null,
    };

    prismaMock.paymentTransaction.findUnique.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(prismaMock),
    );

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'PAID',
      razorpayPaymentId: 'pay_test_123',
    });

    prismaMock.order.updateMany.mockResolvedValue({
      count: 1,
    });

    const result = await service.handleWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            order_id: 'order_test_123',
            amount: 18000,
          },
        },
      },
    });

    expect(result).toEqual({
      received: true,
      processed: true,
      event: 'payment.captured',
      paymentTransactionId: 'payment-1',
      razorpayPaymentId: 'pay_test_123',
      status: 'PAID',
    });

    expect(
      prismaMock.paymentTransaction.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'payment-1',
      },
      data: {
        status: 'PAID',
        razorpayPaymentId: 'pay_test_123',
      },
    });

    expect(
      prismaMock.order.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        paymentTransactionId: 'payment-1',
        status: 'CREATED',
      },
      data: {
        status: 'CONFIRMED',
      },
    });
  });

  it('should safely ignore a duplicate payment.captured webhook', async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PAID',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    });

    const result = await service.handleWebhook({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            order_id: 'order_test_123',
            amount: 18000,
          },
        },
      },
    });

    expect(result).toEqual({
      received: true,
      processed: false,
      reason: 'Payment already marked as PAID',
      paymentTransactionId: 'payment-1',
    });

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.order.updateMany,
    ).not.toHaveBeenCalled();
  });

  it('should reject a webhook when the amount does not match', async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: null,
    });

    await expect(
      service.handleWebhook({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_test_123',
              order_id: 'order_test_123',
              amount: 19000,
            },
          },
        },
      }),
    ).rejects.toThrow(
      'Webhook payment amount does not match the payment transaction',
    );

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();
  });

  it('should mark a pending payment as FAILED on payment.failed', async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: null,
    });

    prismaMock.paymentTransaction.update.mockResolvedValue({
      id: 'payment-1',
      status: 'FAILED',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    });

    const result = await service.handleWebhook({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            order_id: 'order_test_123',
            amount: 18000,
          },
        },
      },
    });

    expect(result).toEqual({
      received: true,
      processed: true,
      event: 'payment.failed',
      paymentTransactionId: 'payment-1',
      razorpayPaymentId: 'pay_test_123',
      status: 'FAILED',
    });
  });

  it('should never downgrade a PAID payment when a failed webhook arrives later', async () => {
    prismaMock.paymentTransaction.findUnique.mockResolvedValue({
      id: 'payment-1',
      status: 'PAID',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    });

    const result = await service.handleWebhook({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            id: 'pay_test_123',
            order_id: 'order_test_123',
            amount: 18000,
          },
        },
      },
    });

    expect(result).toEqual({
      received: true,
      processed: false,
      reason: 'Payment transaction is already in PAID state',
      paymentTransactionId: 'payment-1',
    });

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();
  });
});