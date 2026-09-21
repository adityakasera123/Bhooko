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
    refund: {
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
      count: jest.fn(),
    },
  };

  const razorpayServiceMock: any = {
    createOrder: jest.fn(),
    createRefund: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.$transaction.mockImplementation(
      async (callback: any) => callback(prismaMock),
    );

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

  it('should mark a pending refund as PROCESSED on refund.processed webhook', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'REFUND_PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    };

    const refund = {
      id: 'refund-1',
      paymentTransactionId: paymentTransaction.id,
      razorpayRefundId: 'rfnd_test_123',
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Missing item',
      paymentTransaction,
    };

    prismaMock.refund.findUnique.mockResolvedValue(refund);

    prismaMock.refund.update.mockResolvedValue({
      ...refund,
      status: 'PROCESSED',
    });

    prismaMock.refund.aggregate.mockResolvedValue({
      _sum: {
        amountInPaise: 9000,
      },
    });

    prismaMock.refund.count.mockResolvedValue(0);

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'PAID',
      refundedAmountInPaise: 9000,
    });

    const result = await service.handleWebhook({
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_123',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'processed',
          },
        },
      },
    });

    expect(
      prismaMock.refund.findUnique,
    ).toHaveBeenCalledWith({
      where: {
        razorpayRefundId: 'rfnd_test_123',
      },
      include: {
        paymentTransaction: true,
      },
    });

    expect(
      prismaMock.refund.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'refund-1',
      },
      data: {
        status: 'PROCESSED',
      },
    });

    expect(
      prismaMock.refund.aggregate,
    ).toHaveBeenCalledWith({
      where: {
        paymentTransactionId: 'payment-1',
        status: 'PROCESSED',
      },
      _sum: {
        amountInPaise: true,
      },
    });

    expect(
      prismaMock.refund.count,
    ).toHaveBeenCalledWith({
      where: {
        paymentTransactionId: 'payment-1',
        status: 'PENDING',
      },
    });

    expect(
      prismaMock.paymentTransaction.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'payment-1',
      },
      data: {
        status: 'PAID',
        refundedAmountInPaise: 9000,
      },
    });

    expect(result).toEqual({
      received: true,
      processed: true,
      event: 'refund.processed',
      refundId: 'rfnd_test_123',
      paymentTransactionId: 'payment-1',
      refundStatus: 'PROCESSED',
      paymentStatus: 'PAID',
      refundedAmountInPaise: 9000,
    });
  });

  it('should safely ignore a duplicate refund.processed webhook', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'PAID',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    };

    const refund = {
      id: 'refund-1',
      paymentTransactionId: paymentTransaction.id,
      razorpayRefundId: 'rfnd_test_123',
      amountInPaise: 9000,
      status: 'PROCESSED',
      reason: 'Missing item',
      paymentTransaction,
    };

    prismaMock.refund.findUnique.mockResolvedValue(
      refund,
    );

    const result = await service.handleWebhook({
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_123',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'processed',
          },
        },
      },
    });

    expect(
      prismaMock.refund.update,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.count,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
      processed: false,
      event: 'refund.processed',
      reason: 'Refund is already processed',
      refundId: 'rfnd_test_123',
      paymentTransactionId: 'payment-1',
      status: 'PROCESSED',
    });
  });

  it('should mark a pending refund as FAILED on refund.failed webhook', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'REFUND_PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    };

    const refund = {
      id: 'refund-1',
      paymentTransactionId: paymentTransaction.id,
      razorpayRefundId: 'rfnd_test_failed',
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Wrong item',
      paymentTransaction,
    };

    prismaMock.refund.findUnique.mockResolvedValue(
      refund,
    );

    prismaMock.refund.update.mockResolvedValue({
      ...refund,
      status: 'FAILED',
    });

    prismaMock.refund.aggregate.mockResolvedValue({
      _sum: {
        amountInPaise: 0,
      },
    });

    prismaMock.refund.count.mockResolvedValue(0);

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'PAID',
      refundedAmountInPaise: 0,
    });

    const result = await service.handleWebhook({
      event: 'refund.failed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_failed',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'failed',
          },
        },
      },
    });

    expect(
      prismaMock.refund.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'refund-1',
      },
      data: {
        status: 'FAILED',
      },
    });

    expect(
      prismaMock.paymentTransaction.update,
    ).toHaveBeenCalledWith({
      where: {
        id: 'payment-1',
      },
      data: {
        status: 'PAID',
        refundedAmountInPaise: 0,
      },
    });

    expect(result).toEqual({
      received: true,
      processed: true,
      event: 'refund.failed',
      refundId: 'rfnd_test_failed',
      paymentTransactionId: 'payment-1',
      refundStatus: 'FAILED',
      paymentStatus: 'PAID',
      refundedAmountInPaise: 0,
    });
  });

  it('should safely ignore a duplicate refund.failed webhook', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'PAID',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    };

    const refund = {
      id: 'refund-1',
      paymentTransactionId: paymentTransaction.id,
      razorpayRefundId: 'rfnd_test_failed',
      amountInPaise: 9000,
      status: 'FAILED',
      reason: 'Wrong item',
      paymentTransaction,
    };

    prismaMock.refund.findUnique.mockResolvedValue(refund);

    const result = await service.handleWebhook({
      event: 'refund.failed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_test_failed',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'failed',
          },
        },
      },
    });

    expect(
      prismaMock.refund.update,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.count,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
      processed: false,
      event: 'refund.failed',
      reason: 'Refund has already failed',
      refundId: 'rfnd_test_failed',
      paymentTransactionId: 'payment-1',
      status: 'FAILED',
    });
  });

  it('should safely ignore a webhook for an unknown refund', async () => {
    prismaMock.refund.findUnique.mockResolvedValue(null);

    const result = await service.handleWebhook({
      event: 'refund.processed',
      payload: {
        refund: {
          entity: {
            id: 'rfnd_unknown',
            payment_id: 'pay_test_123',
            amount: 9000,
            status: 'processed',
          },
        },
      },
    });

    expect(
      prismaMock.refund.update,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.count,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      received: true,
      processed: false,
      event: 'refund.processed',
      reason: 'Refund record not found',
      refundId: 'rfnd_unknown',
    });
  });

  it('should reject a refund webhook when the payment mapping is incorrect', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'REFUND_PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    };

    const refund = {
      id: 'refund-1',
      paymentTransactionId: paymentTransaction.id,
      razorpayRefundId: 'rfnd_test_123',
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Missing item',
      paymentTransaction,
    };

    prismaMock.refund.findUnique.mockResolvedValue(
      refund,
    );

    await expect(
      service.handleWebhook({
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_test_123',
              payment_id: 'pay_WRONG',
              amount: 9000,
              status: 'processed',
            },
          },
        },
      }),
    ).rejects.toThrow(
      'Razorpay refund payment ID does not match the payment transaction',
    );

    expect(
      prismaMock.refund.update,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.count,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();
  });

    it('should reject a refund webhook when the refund amount is incorrect', async () => {
    const paymentTransaction = {
      id: 'payment-1',
      customerId: 'customer-1',
      status: 'REFUND_PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
    };

    const refund = {
      id: 'refund-1',
      paymentTransactionId: paymentTransaction.id,
      razorpayRefundId: 'rfnd_test_123',
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Missing item',
      paymentTransaction,
    };

    prismaMock.refund.findUnique.mockResolvedValue(
      refund,
    );

    await expect(
      service.handleWebhook({
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_test_123',
              payment_id: 'pay_test_123',
              amount: 10000,
              status: 'processed',
            },
          },
        },
      }),
    ).rejects.toThrow(
      'Razorpay refund amount does not match the refund record',
    );

    expect(
      prismaMock.refund.update,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.count,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();
  });
});