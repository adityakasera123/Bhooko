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
      findUnique: jest.fn(),
    },
   refund: {
  findUnique: jest.fn(),
  aggregate: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  count: jest.fn(),
},
  };

  const razorpayServiceMock: any = {
    createOrder: jest.fn(),
    createRefund: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prismaMock.refund.findUnique.mockResolvedValue(null);

    prismaMock.$transaction.mockImplementation(
      async (callback: any) =>
        callback({
          ...prismaMock,
          $queryRaw: jest.fn(async () => []),
        } as any),
    );



    prismaMock.refund.aggregate.mockResolvedValue({
      _sum: {
        amountInPaise: 0,
      },
    });

    prismaMock.refund.count.mockResolvedValue(0);

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

    expect(
      prismaMock.paymentTransaction.create,
    ).not.toHaveBeenCalled();

    expect(
      razorpayServiceMock.createOrder,
    ).not.toHaveBeenCalled();
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

    const razorpayRefund = {
      id: 'rfnd_test_123',
      status: 'pending',
      amount: 9000,
      payment_id: 'pay_test_123',
    };

    const reservation = {
      id: 'refund-record-1',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Missing item',
      idempotencyKey: 'refund-test-1',
    };

    const updatedRefund = {
      ...reservation,
      razorpayRefundId: razorpayRefund.id,
      status: 'PENDING',
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.findUnique.mockImplementation(
      async ({ where }: any) => {
        if (where?.id === reservation.id) return reservation;
        return null;
      },
    );

    prismaMock.refund.aggregate
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } })
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } })
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } })
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } });

    prismaMock.refund.count.mockResolvedValue(1);

    prismaMock.refund.create.mockResolvedValue(reservation);
    prismaMock.refund.update.mockResolvedValue(updatedRefund);

    razorpayServiceMock.createRefund.mockResolvedValue(razorpayRefund);

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'REFUND_PENDING',
      refundId: razorpayRefund.id,
      refundedAmountInPaise: 0,
      refundReason: 'Missing item',
    });

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 9000,
        reason: 'Missing item',
        idempotencyKey: 'refund-test-1',
      },
    );

    expect(razorpayServiceMock.createRefund).toHaveBeenCalledWith(
      'pay_test_123',
      9000,
      paymentTransactionId,
    );

    expect(prismaMock.refund.create).toHaveBeenCalledWith({
      data: {
        paymentTransactionId,
        razorpayRefundId: null,
        amountInPaise: 9000,
        status: 'PENDING',
        reason: 'Missing item',
        idempotencyKey: 'refund-test-1',
      },
    });

    expect(prismaMock.refund.update).toHaveBeenCalledWith({
      where: { id: 'refund-record-1' },
      data: {
        razorpayRefundId: 'rfnd_test_123',
        status: 'PENDING',
      },
    });

    expect(prismaMock.paymentTransaction.update).toHaveBeenCalledWith({
      where: { id: paymentTransactionId },
      data: {
        status: 'REFUND_PENDING',
        refundId: 'rfnd_test_123',
        refundedAmountInPaise: 0,
        refundReason: 'Missing item',
      },
    });

    expect(result).toEqual({
      message: 'Refund initiated successfully',
      paymentTransactionId,
      refundId: 'rfnd_test_123',
      refundedAmountInPaise: 0,
      status: 'REFUND_PENDING',
      orderIds: ['order-1'],
    });
  });



  it('should return the existing refund for the same idempotency key', async () => {
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

  const existingRefund = {
    id: 'refund-record-1',
    paymentTransactionId,
    razorpayRefundId: 'rfnd_existing_123',
    amountInPaise: 9000,
    status: 'PENDING',
    reason: 'Missing item',
  };

  prismaMock.paymentTransaction.findFirst.mockResolvedValue(
    paymentTransaction,
  );

  prismaMock.refund.findUnique.mockResolvedValue(
    existingRefund,
  );

  const result = await service.requestRefund(
    userId,
    paymentTransactionId,
    {
      amountInPaise: 9000,
      reason: 'Missing item',
      idempotencyKey: 'refund-idempotency-1',
    },
  );

  expect(
    prismaMock.refund.findUnique,
  ).toHaveBeenCalledWith({
    where: {
      paymentTransactionId_idempotencyKey: {
        paymentTransactionId,
        idempotencyKey: 'refund-idempotency-1',
      },
    },
  });

  expect(
    razorpayServiceMock.createRefund,
  ).not.toHaveBeenCalled();

  expect(
    prismaMock.refund.create,
  ).not.toHaveBeenCalled();

  expect(result).toEqual({
    message: 'Refund is already pending',
    paymentTransactionId,
    refundId: 'rfnd_existing_123',
    refundedAmountInPaise: 9000,
    status: 'REFUND_PENDING',
    orderIds: ['order-1'],
  });
});

  it('should mark payment as REFUNDED when Razorpay refund is processed', async () => {
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

    const razorpayRefund = {
      id: 'rfnd_test_456',
      status: 'processed',
      amount: 18000,
      payment_id: 'pay_test_123',
    };

    const reservation = {
      id: 'refund-record-2',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 18000,
      status: 'PENDING',
      reason: 'Full refund',
      idempotencyKey: 'refund-test-2',
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.findUnique.mockImplementation(
      async ({ where }: any) => {
        if (where?.id === reservation.id) return reservation;
        return null;
      },
    );

    let fullRefundAggregateCall = 0;
    const fullRefundAggregateValues = [0, 0, 18000, 18000];
    prismaMock.refund.aggregate.mockImplementation(async () => ({
      _sum: {
        amountInPaise:
          fullRefundAggregateValues[fullRefundAggregateCall++] ?? 18000,
      },
    }));

    prismaMock.refund.count.mockResolvedValue(0);

    prismaMock.refund.create.mockResolvedValue(reservation);
    prismaMock.refund.update.mockResolvedValue({
      ...reservation,
      razorpayRefundId: razorpayRefund.id,
      status: 'PROCESSED',
    });

    razorpayServiceMock.createRefund.mockResolvedValue(razorpayRefund);

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'REFUNDED',
      refundId: razorpayRefund.id,
      refundedAmountInPaise: 18000,
      refundReason: 'Full refund',
    });

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 18000,
        reason: 'Full refund',
        idempotencyKey: 'refund-test-2',
      },
    );

    expect(razorpayServiceMock.createRefund).toHaveBeenCalledWith(
      'pay_test_123',
      18000,
      paymentTransactionId,
    );

    expect(prismaMock.refund.create).toHaveBeenCalledWith({
      data: {
        paymentTransactionId,
        razorpayRefundId: null,
        amountInPaise: 18000,
        status: 'PENDING',
        reason: 'Full refund',
        idempotencyKey: 'refund-test-2',
      },
    });

    expect(prismaMock.refund.update).toHaveBeenCalledWith({
      where: { id: 'refund-record-2' },
      data: {
        razorpayRefundId: 'rfnd_test_456',
        status: 'PROCESSED',
      },
    });

    expect(prismaMock.paymentTransaction.update).toHaveBeenLastCalledWith({
      where: { id: paymentTransactionId },
      data: {
        status: 'REFUNDED',
        refundId: 'rfnd_test_456',
        refundedAmountInPaise: 18000,
        refundReason: 'Full refund',
      },
    });

    expect(result).toEqual({
      message: 'Refund completed successfully',
      paymentTransactionId,
      refundId: 'rfnd_test_456',
      refundedAmountInPaise: 18000,
      status: 'REFUNDED',
      orderIds: ['order-1'],
    });
  });



  it('should support cumulative partial refunds and mark payment as REFUNDED after the full amount is refunded', async () => {
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

    const firstReservation = {
      id: 'refund-record-1',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Missing item',
      idempotencyKey: 'refund-test-3',
    };

    const secondReservation = {
      id: 'refund-record-2',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Order cancelled',
      idempotencyKey: 'refund-test-4',
    };

    const firstRefund = {
      id: 'rfnd_test_001',
      status: 'processed',
      amount: 9000,
      payment_id: 'pay_test_123',
    };

    const secondRefund = {
      id: 'rfnd_test_002',
      status: 'processed',
      amount: 9000,
      payment_id: 'pay_test_123',
    };

    prismaMock.paymentTransaction.findFirst
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.findUnique.mockImplementation(
      async ({ where }: any) => {
        if (where?.id === firstReservation.id) return firstReservation;
        if (where?.id === secondReservation.id) return secondReservation;
        return null;
      },
    );

    // First request: 0 processed + 0 pending before reservation,
    // then 9000 processed + 0 pending after Razorpay.
    // Second request: 9000 processed + 0 pending before reservation,
    // then 18000 processed + 0 pending after Razorpay.
    let partialRefundAggregateCall = 0;
    const partialRefundAggregateValues = [
      0, 0, 9000, 9000,
      9000, 0, 18000, 18000,
    ];
    prismaMock.refund.aggregate.mockImplementation(async () => ({
      _sum: {
        amountInPaise:
          partialRefundAggregateValues[partialRefundAggregateCall++] ?? 18000,
      },
    }));

    prismaMock.refund.count.mockResolvedValue(0);

    prismaMock.refund.create
      .mockResolvedValueOnce(firstReservation)
      .mockResolvedValueOnce(secondReservation);

    prismaMock.refund.update
      .mockResolvedValueOnce({
        ...firstReservation,
        razorpayRefundId: firstRefund.id,
        status: 'PROCESSED',
      })
      .mockResolvedValueOnce({
        ...secondReservation,
        razorpayRefundId: secondRefund.id,
        status: 'PROCESSED',
      });

    razorpayServiceMock.createRefund
      .mockResolvedValueOnce(firstRefund)
      .mockResolvedValueOnce(secondRefund);

    prismaMock.paymentTransaction.update.mockResolvedValue(paymentTransaction);

    const firstResult = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 9000,
        reason: 'Missing item',
        idempotencyKey: 'refund-test-3',
      },
    );

    const secondResult = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 9000,
        reason: 'Order cancelled',
        idempotencyKey: 'refund-test-4',
      },
    );

    expect(firstResult).toEqual({
      message: 'Partial refund completed successfully',
      paymentTransactionId,
      refundId: 'rfnd_test_001',
      refundedAmountInPaise: 9000,
      status: 'PAID',
      orderIds: ['order-1'],
    });

    expect(secondResult).toEqual({
      message: 'Refund completed successfully',
      paymentTransactionId,
      refundId: 'rfnd_test_002',
      refundedAmountInPaise: 18000,
      status: 'REFUNDED',
      orderIds: ['order-1'],
    });

    expect(razorpayServiceMock.createRefund).toHaveBeenNthCalledWith(
      1,
      'pay_test_123',
      9000,
      paymentTransactionId,
    );

    expect(razorpayServiceMock.createRefund).toHaveBeenNthCalledWith(
      2,
      'pay_test_123',
      9000,
      paymentTransactionId,
    );

    expect(prismaMock.refund.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.refund.update).toHaveBeenCalledTimes(2);
  });



  it('should reject a refund amount greater than the remaining refundable amount', async () => {
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
      refundId: 'rfnd_test_previous',
      refundedAmountInPaise: 9000,
      refundReason: 'Missing item',
      orders: [
        {
          id: 'order-1',
          customerId: userId,
        },
      ],
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.aggregate
      .mockResolvedValueOnce({ _sum: { amountInPaise: 9000 } })
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } });

    await expect(
      service.requestRefund(
        userId,
        paymentTransactionId,
        {
          amountInPaise: 10000,
          reason: 'Wrong item',
          idempotencyKey: 'refund-test-5',

        },
      ),
    ).rejects.toThrow(
      'Refund amount cannot exceed the remaining refundable amount of 9000 paise',
    );

    expect(
      razorpayServiceMock.createRefund,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.create,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();
  });



  it('should handle a failed Razorpay refund without changing payment state', async () => {
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
      id: 'rfnd_test_failed',
      status: 'failed',
      amount: 9000,
      payment_id: 'pay_test_123',
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    const reservation = {
      id: 'refund-record-3',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 9000,
      status: 'PENDING',
      reason: 'Wrong item',
      idempotencyKey: 'refund-test-6',
    };

    prismaMock.refund.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(reservation);

    prismaMock.refund.create.mockResolvedValue(reservation);
    prismaMock.refund.update.mockResolvedValue({
      ...reservation,
      razorpayRefundId: refund.id,
      status: 'FAILED',
    });

    razorpayServiceMock.createRefund.mockResolvedValue(refund);

    prismaMock.paymentTransaction.update.mockResolvedValue({
      ...paymentTransaction,
      status: 'PAID',
      refundId: refund.id,
      refundedAmountInPaise: 0,
      refundReason: 'Wrong item',
    });

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 9000,
        reason: 'Wrong item',
        idempotencyKey: 'refund-test-6',

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
      prismaMock.refund.create,
    ).toHaveBeenCalledWith({
      data: {
        paymentTransactionId,
        razorpayRefundId: null,
        amountInPaise: 9000,
        status: 'PENDING',
        reason: 'Wrong item',
        idempotencyKey: 'refund-test-6',
      },
    });

    expect(
      prismaMock.paymentTransaction.update,
    ).toHaveBeenCalledWith({
      where: {
        id: paymentTransactionId,
      },
      data: {
        status: 'PAID',
        refundId: 'rfnd_test_failed',
        refundedAmountInPaise: 0,
        refundReason: 'Wrong item',
      },
    });

    expect(result).toEqual({
      message: 'Refund failed',
      paymentTransactionId,
      refundId: 'rfnd_test_failed',
      refundedAmountInPaise: 0,
      status: 'PAID',
      orderIds: ['order-1'],
    });
  });

  it('should not create another refund when a refund is already pending', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'REFUND_PENDING',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      refundId: 'rfnd_test_pending',
      refundedAmountInPaise: 9000,
      refundReason: 'Missing item',
      orders: [
        {
          id: 'order-1',
          customerId: userId,
        },
      ],
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 9000,
        reason: 'Missing item',
        idempotencyKey: 'refund-test-7',

      },
    );

    expect(
      razorpayServiceMock.createRefund,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.create,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      message: 'Refund is already pending',
      paymentTransactionId,
      refundId: 'rfnd_test_pending',
      refundedAmountInPaise: 9000,
      status: 'REFUND_PENDING',
      orderIds: ['order-1'],
    });
  });

  it('should not create another refund when the payment is already refunded', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'REFUNDED',
      amountInPaise: 18000,
      currency: 'INR',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_123',
      refundId: 'rfnd_test_completed',
      refundedAmountInPaise: 18000,
      refundReason: 'Full refund',
      orders: [
        {
          id: 'order-1',
          customerId: userId,
        },
      ],
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 18000,
        reason: 'Full refund',
        idempotencyKey: 'refund-test-8',

      },
    );

    expect(
      razorpayServiceMock.createRefund,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.create,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.aggregate,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.paymentTransaction.update,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      message: 'Refund has already been completed',
      paymentTransactionId,
      refundId: 'rfnd_test_completed',
      refundedAmountInPaise: 18000,
      status: 'REFUNDED',
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

    expect(
      prismaMock.paymentTransaction.create,
    ).toHaveBeenCalled();

    expect(
      razorpayServiceMock.createOrder,
    ).toHaveBeenCalledWith(
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

    expect(
      prismaMock.paymentTransaction.create,
    ).not.toHaveBeenCalled();

    expect(
      razorpayServiceMock.createOrder,
    ).not.toHaveBeenCalled();
  });

describe('requestRefund concurrency protection', () => {
  it('should prevent a concurrent refund from exceeding the remaining refundable amount', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'PAID',
      amountInPaise: 10000,
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

    const reservation = {
      id: 'refund-reservation-1',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 10000,
      status: 'PENDING',
      reason: 'Order issue',
      idempotencyKey: 'refund-concurrent-1',
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.findUnique.mockImplementation(
      async ({ where }: any) => {
        if (where?.id === reservation.id) return reservation;
        return null;
      },
    );

    prismaMock.refund.aggregate.mockResolvedValue({
      _sum: { amountInPaise: 0 },
    });

    prismaMock.refund.count.mockResolvedValue(1);

    prismaMock.refund.create.mockResolvedValue(reservation);
    prismaMock.refund.update.mockResolvedValue({
      ...reservation,
      razorpayRefundId: 'rfnd-concurrent-1',
      status: 'PENDING',
    });

    prismaMock.paymentTransaction.update.mockResolvedValue(
      paymentTransaction,
    );

    // Razorpay accepted the request but has not completed it yet.
    razorpayServiceMock.createRefund.mockResolvedValue({
      id: 'rfnd-concurrent-1',
      status: 'pending',
      amount: 10000,
      payment_id: 'pay_test_123',
    });

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 10000,
        reason: 'Order issue',
        idempotencyKey: 'refund-concurrent-1',
      },
    );

    expect(result).toEqual(
      expect.objectContaining({
        paymentTransactionId,
        status: 'REFUND_PENDING',
      }),
    );

    expect(prismaMock.refund.create).toHaveBeenCalledTimes(1);
  });



  it('should return the existing refund for the same idempotency key', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'PAID',
      amountInPaise: 10000,
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

    const existingRefund = {
      id: 'refund-existing-1',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 5000,
      status: 'PENDING',
      reason: 'Missing item',
      idempotencyKey: 'same-key',
    };

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.refund.findUnique.mockResolvedValue(
      existingRefund,
    );

    const result = await service.requestRefund(
      userId,
      paymentTransactionId,
      {
        amountInPaise: 5000,
        reason: 'Missing item',
        idempotencyKey: 'same-key',
      },
    );

    expect(
      razorpayServiceMock.createRefund,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.create,
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      message: 'Refund is already pending',
      paymentTransactionId,
      refundId: null,
      refundedAmountInPaise: 5000,
      status: 'REFUND_PENDING',
      orderIds: ['order-1'],
    });
  });

  it('should reject a refund that exceeds the remaining refundable amount', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'PAID',
      amountInPaise: 10000,
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

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.refund.findUnique.mockResolvedValue(null);

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.aggregate
      .mockResolvedValueOnce({ _sum: { amountInPaise: 8000 } })
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } });

    await expect(
      service.requestRefund(
        userId,
        paymentTransactionId,
        {
          amountInPaise: 3000,
          reason: 'Order issue',
          idempotencyKey: 'refund-over-limit',
        },
      ),
    ).rejects.toThrow(
      'Refund amount cannot exceed the remaining refundable amount',
    );

    expect(
      razorpayServiceMock.createRefund,
    ).not.toHaveBeenCalled();

    expect(
      prismaMock.refund.create,
    ).not.toHaveBeenCalled();
  });

  it('should keep the refund reservation pending when Razorpay fails', async () => {
    const userId = 'customer-1';
    const paymentTransactionId = 'payment-1';

    const paymentTransaction = {
      id: paymentTransactionId,
      customerId: userId,
      status: 'PAID',
      amountInPaise: 10000,
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

    prismaMock.paymentTransaction.findFirst.mockResolvedValue(
      paymentTransaction,
    );

    prismaMock.paymentTransaction.findUnique
      .mockResolvedValueOnce(paymentTransaction)
      .mockResolvedValueOnce(paymentTransaction);

    prismaMock.refund.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    prismaMock.refund.aggregate
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } })
      .mockResolvedValueOnce({ _sum: { amountInPaise: 0 } });

    prismaMock.refund.create.mockResolvedValue({
      id: 'refund-reservation-1',
      paymentTransactionId,
      razorpayRefundId: null,
      amountInPaise: 5000,
      status: 'PENDING',
      reason: 'Order issue',
      idempotencyKey: 'refund-network-failure',
    });

    prismaMock.paymentTransaction.update.mockResolvedValue(
      paymentTransaction,
    );

    razorpayServiceMock.createRefund.mockRejectedValue(
      new Error('Razorpay request failed'),
    );

    await expect(
      service.requestRefund(
        userId,
        paymentTransactionId,
        {
          amountInPaise: 5000,
          reason: 'Order issue',
          idempotencyKey: 'refund-network-failure',
        },
      ),
    ).rejects.toThrow('Razorpay request failed');

    expect(
      prismaMock.refund.create,
    ).toHaveBeenCalledWith({
      data: {
        paymentTransactionId,
        razorpayRefundId: null,
        amountInPaise: 5000,
        status: 'PENDING',
        reason: 'Order issue',
        idempotencyKey: 'refund-network-failure',
      },
    });

    expect(
      razorpayServiceMock.createRefund,
    ).toHaveBeenCalledTimes(1);
  });
});

});
