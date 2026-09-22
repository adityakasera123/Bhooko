import { jest } from '@jest/globals';

import { ReconciliationRunService } from './reconciliation-run.service';

describe('ReconciliationRunService', () => {
  let service: ReconciliationRunService;

  const prismaMock = {
    reconciliationRun: {
      create: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
      findUnique: jest.fn<() => Promise<unknown>>(),
    },

   paymentTransaction: {
  findMany: jest.fn<() => Promise<unknown>>(),
  findFirst: jest.fn<() => Promise<unknown>>(),
},

    refund: {
      findMany: jest.fn<() => Promise<unknown>>(),
    },

    reconciliationRecord: {
      create: jest.fn<() => Promise<unknown>>(),
      findMany: jest.fn<() => Promise<unknown>>(),
    },
  };

 const providerMock = {
  fetchPayment: jest.fn<() => Promise<unknown>>(),
  fetchPayments: jest.fn<() => Promise<unknown>>(),
};

  const matcherMock = {
    matchPayment: jest.fn(),
  };

  const resolutionServiceMock = {
    resolvePayment: jest.fn<() => Promise<unknown>>(),
  };

  const refundReconciliationServiceMock = {
    reconcileRefund: jest.fn<() => Promise<unknown>>(),
  };

  beforeEach(() => {
  jest.clearAllMocks();

  providerMock.fetchPayments.mockResolvedValue([]);

  prismaMock.paymentTransaction.findFirst.mockResolvedValue(null);

  service = new ReconciliationRunService(
    prismaMock as any,
    providerMock as any,
    matcherMock as any,
    resolutionServiceMock as any,
    refundReconciliationServiceMock as any,
  );
});

  // ============================================================
  // START RUN
  // ============================================================

  it('should create a reconciliation run in RUNNING state', async () => {
    const run = {
      id: 'run-1',
      mode: 'SCHEDULED',
      status: 'RUNNING',
    };

    prismaMock.reconciliationRun.create.mockResolvedValue(
      run,
    );

    const result = await service.startRun(
      'SCHEDULED',
    );

    expect(
      prismaMock.reconciliationRun.create,
    ).toHaveBeenCalledWith({
      data: {
        mode: 'SCHEDULED',
        status: 'RUNNING',
        windowStart: undefined,
        windowEnd: undefined,
      },
    });

    expect(result).toEqual(run);
  });

  // ============================================================
  // PAYMENT RECONCILIATION
  // ============================================================

  it(
    'should reconcile payments and finalize the run',
    async () => {
      const run = {
        id: 'run-1',
        mode: 'SCHEDULED',
        status: 'RUNNING',
      };

      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        razorpayOrderId: 'order_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const externalPayment = {
        id: 'pay_123',
        orderId: 'order_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'captured',
        createdAt: new Date(),
      };

      const matchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MATCHED',
        mismatchType: 'NONE',
        mismatchTypes: [],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PAID',
        externalState: 'captured',
        reason:
          'Local and external payment records match',
      };

      prismaMock.reconciliationRun.create.mockResolvedValue(
        run,
      );

      prismaMock.paymentTransaction.findMany.mockResolvedValue(
        [payment],
      );

      prismaMock.refund.findMany.mockResolvedValue([]);

      providerMock.fetchPayment.mockResolvedValue(
        externalPayment,
      );

      matcherMock.matchPayment.mockReturnValue(
        matchResult,
      );

      resolutionServiceMock.resolvePayment.mockResolvedValue({
        id: 'record-1',
      });

      prismaMock.reconciliationRecord.findMany.mockResolvedValue(
        [
          {
            resolutionStatus: 'MATCHED',
          },
        ],
      );

      prismaMock.reconciliationRun.update.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
      });

      prismaMock.reconciliationRun.findUnique.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
        records: [
          {
            id: 'record-1',
          },
        ],
      });

      const result = await service.run(
        'SCHEDULED',
      );

      expect(
        providerMock.fetchPayment,
      ).toHaveBeenCalledWith('pay_123');

      expect(
        matcherMock.matchPayment,
      ).toHaveBeenCalledTimes(1);

      expect(
        resolutionServiceMock.resolvePayment,
      ).toHaveBeenCalledWith(
        'run-1',
        'payment-tx-1',
        matchResult,
      );

      expect(
        refundReconciliationServiceMock.reconcileRefund,
      ).not.toHaveBeenCalled();

      expect(
        prismaMock.reconciliationRun.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'run-1',
          },
          data: expect.objectContaining({
            status: 'COMPLETED',
            totalChecked: 1,
            matchedCount: 1,
            mismatchCount: 0,
            autoResolvedCount: 0,
            reviewRequiredCount: 0,
            errorCount: 0,
          }),
        }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
        }),
      );
    },
  );

  // ============================================================
  // REFUND RECONCILIATION
  // ============================================================

  it(
    'should reconcile refunds during the run',
    async () => {
      const run = {
        id: 'run-2',
        mode: 'SCHEDULED',
        status: 'RUNNING',
      };

      const refund = {
        id: 'refund-1',
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_123',
        amountInPaise: 9000,
        status: 'PROCESSED',
        createdAt: new Date(),
      };

      prismaMock.reconciliationRun.create.mockResolvedValue(
        run,
      );

      prismaMock.paymentTransaction.findMany.mockResolvedValue(
        [],
      );

      prismaMock.refund.findMany.mockResolvedValue(
        [refund],
      );

      refundReconciliationServiceMock.reconcileRefund.mockResolvedValue(
        {
          id: 'refund-record-1',
        },
      );

      prismaMock.reconciliationRecord.findMany.mockResolvedValue(
        [
          {
            resolutionStatus: 'MATCHED',
          },
        ],
      );

      prismaMock.reconciliationRun.update.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
      });

      prismaMock.reconciliationRun.findUnique.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
        records: [
          {
            id: 'refund-record-1',
          },
        ],
      });

      const result = await service.run(
        'SCHEDULED',
      );

      expect(
        prismaMock.refund.findMany,
      ).toHaveBeenCalled();

      expect(
        refundReconciliationServiceMock.reconcileRefund,
      ).toHaveBeenCalledWith(
        'run-2',
        'refund-1',
      );

      expect(
        refundReconciliationServiceMock.reconcileRefund,
      ).toHaveBeenCalledTimes(1);

      expect(result).toEqual(
        expect.objectContaining({
          status: 'COMPLETED',
        }),
      );
    },
  );

  // ============================================================
  // PAYMENT + REFUND IN SAME RUN
  // ============================================================

  it(
    'should reconcile both payments and refunds in the same run',
    async () => {
      const run = {
        id: 'run-3',
        mode: 'SCHEDULED',
        status: 'RUNNING',
      };

      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        razorpayOrderId: 'order_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const refund = {
        id: 'refund-1',
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_123',
        amountInPaise: 9000,
        status: 'PROCESSED',
        createdAt: new Date(),
      };

      const matchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MATCHED',
        mismatchType: 'NONE',
        mismatchTypes: [],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PAID',
        externalState: 'captured',
        reason: 'Payment matched',
      };

      prismaMock.reconciliationRun.create.mockResolvedValue(
        run,
      );

      prismaMock.paymentTransaction.findMany.mockResolvedValue(
        [payment],
      );

      prismaMock.refund.findMany.mockResolvedValue(
        [refund],
      );

      providerMock.fetchPayment.mockResolvedValue({
        id: 'pay_123',
        orderId: 'order_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'captured',
        createdAt: new Date(),
      });

      matcherMock.matchPayment.mockReturnValue(
        matchResult,
      );

      resolutionServiceMock.resolvePayment.mockResolvedValue({
        id: 'payment-record-1',
      });

      refundReconciliationServiceMock.reconcileRefund.mockResolvedValue({
        id: 'refund-record-1',
      });

      prismaMock.reconciliationRecord.findMany.mockResolvedValue(
        [
          {
            resolutionStatus: 'MATCHED',
          },
          {
            resolutionStatus: 'MATCHED',
          },
        ],
      );

      prismaMock.reconciliationRun.update.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
      });

      prismaMock.reconciliationRun.findUnique.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
        records: [
          {
            id: 'payment-record-1',
          },
          {
            id: 'refund-record-1',
          },
        ],
      });

      await service.run('SCHEDULED');

      expect(
        providerMock.fetchPayment,
      ).toHaveBeenCalledWith('pay_123');

      expect(
        resolutionServiceMock.resolvePayment,
      ).toHaveBeenCalledTimes(1);

      expect(
        refundReconciliationServiceMock.reconcileRefund,
      ).toHaveBeenCalledWith(
        'run-3',
        'refund-1',
      );

      expect(
        refundReconciliationServiceMock.reconcileRefund,
      ).toHaveBeenCalledTimes(1);
    },
  );

  // ============================================================
  // RECONCILIATION WINDOW
  // ============================================================

  it('should support a reconciliation window', async () => {
    const windowStart = new Date(
      '2026-09-20T00:00:00.000Z',
    );

    const windowEnd = new Date(
      '2026-09-21T00:00:00.000Z',
    );

    prismaMock.reconciliationRun.create.mockResolvedValue({
      id: 'run-4',
      mode: 'SCHEDULED',
      status: 'RUNNING',
    });

    prismaMock.paymentTransaction.findMany.mockResolvedValue(
      [],
    );

    prismaMock.refund.findMany.mockResolvedValue(
      [],
    );

    prismaMock.reconciliationRecord.findMany.mockResolvedValue(
      [],
    );

    prismaMock.reconciliationRun.update.mockResolvedValue({
      id: 'run-4',
      status: 'COMPLETED',
    });

    prismaMock.reconciliationRun.findUnique.mockResolvedValue({
      id: 'run-4',
      status: 'COMPLETED',
      records: [],
    });

    await service.run(
      'SCHEDULED',
      windowStart,
      windowEnd,
    );

    expect(
  prismaMock.paymentTransaction.findMany,
).toHaveBeenCalledWith({
  where: {
    createdAt: {
      gte: windowStart,
      lte: windowEnd,
    },
  },
  orderBy: {
    createdAt: 'asc',
  },
});

    expect(
      prismaMock.refund.findMany,
    ).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  });

  // ============================================================
  // PROVIDER ERROR
  // ============================================================

  it(
    'should create an ERROR reconciliation record when provider fetch fails',
    async () => {
      const run = {
        id: 'run-5',
        mode: 'SCHEDULED',
        status: 'RUNNING',
      };

      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        razorpayOrderId: 'order_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      prismaMock.reconciliationRun.create.mockResolvedValue(
        run,
      );

      prismaMock.paymentTransaction.findMany.mockResolvedValue(
        [payment],
      );

      prismaMock.refund.findMany.mockResolvedValue(
        [],
      );

      providerMock.fetchPayment.mockRejectedValue(
        new Error('Razorpay unavailable'),
      );

      prismaMock.reconciliationRecord.create.mockResolvedValue({
        id: 'error-record-1',
      });

      prismaMock.reconciliationRecord.findMany.mockResolvedValue(
        [
          {
            resolutionStatus: 'ERROR',
          },
        ],
      );

      prismaMock.reconciliationRun.update.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
      });

      prismaMock.reconciliationRun.findUnique.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
        records: [
          {
            id: 'error-record-1',
          },
        ],
      });

      await service.run('SCHEDULED');

      expect(
        prismaMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reconciliationRunId: 'run-5',
            paymentTransactionId: 'payment-tx-1',
            entityType: 'PAYMENT',
            entityExternalId: 'pay_123',
            mismatchType: 'UNKNOWN',
            resolutionStatus: 'ERROR',
            errorCode: 'RECONCILIATION_ERROR',
            errorMessage: 'Razorpay unavailable',
          }),
        }),
      );

      expect(
        prismaMock.reconciliationRun.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            totalChecked: 1,
            errorCount: 1,
          }),
        }),
      );
    },
  );

  // ============================================================
  // CONTINUE AFTER ONE PAYMENT FAILURE
  // ============================================================

  it(
    'should continue processing when one payment fails',
    async () => {
      const run = {
        id: 'run-6',
        mode: 'SCHEDULED',
        status: 'RUNNING',
      };

      const paymentOne = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        razorpayOrderId: 'order_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const paymentTwo = {
        id: 'payment-tx-2',
        razorpayPaymentId: 'pay_456',
        razorpayOrderId: 'order_456',
        amountInPaise: 25000,
        currency: 'INR',
        status: 'PAID',
      };

      const matchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MATCHED',
        mismatchType: 'NONE',
        mismatchTypes: [],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PAID',
        externalState: 'captured',
        reason: 'Payment matched',
      };

      prismaMock.reconciliationRun.create.mockResolvedValue(
        run,
      );

      prismaMock.paymentTransaction.findMany.mockResolvedValue(
        [paymentOne, paymentTwo],
      );

      prismaMock.refund.findMany.mockResolvedValue(
        [],
      );

      providerMock.fetchPayment
        .mockRejectedValueOnce(
          new Error('Temporary provider error'),
        )
        .mockResolvedValueOnce({
          id: 'pay_456',
          orderId: 'order_456',
          amountInPaise: 25000,
          currency: 'INR',
          status: 'captured',
          createdAt: new Date(),
        });

      matcherMock.matchPayment.mockReturnValue(
        matchResult,
      );

      resolutionServiceMock.resolvePayment.mockResolvedValue({
        id: 'record-2',
      });

      prismaMock.reconciliationRecord.create.mockResolvedValue({
        id: 'error-record-2',
      });

      prismaMock.reconciliationRecord.findMany.mockResolvedValue(
        [
          {
            resolutionStatus: 'ERROR',
          },
          {
            resolutionStatus: 'MATCHED',
          },
        ],
      );

      prismaMock.reconciliationRun.update.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
      });

      prismaMock.reconciliationRun.findUnique.mockResolvedValue({
        ...run,
        status: 'COMPLETED',
        records: [],
      });

      

      await service.run('SCHEDULED');

      expect(
        providerMock.fetchPayment,
      ).toHaveBeenCalledTimes(2);

      expect(
        resolutionServiceMock.resolvePayment,
      ).toHaveBeenCalledTimes(1);

      expect(
        prismaMock.reconciliationRecord.create,
      ).toHaveBeenCalledTimes(1);
    },
  );

  // ============================================================
  // UNEXPECTED RUN-LEVEL ERROR
  // ============================================================

  it(
    'should mark the run FAILED when an unexpected run-level error occurs',
    async () => {
      const run = {
        id: 'run-7',
        mode: 'SCHEDULED',
        status: 'RUNNING',
      };

      prismaMock.reconciliationRun.create.mockResolvedValue(
        run,
      );

      prismaMock.paymentTransaction.findMany.mockRejectedValue(
        new Error('Database unavailable'),
      );

      prismaMock.reconciliationRun.update.mockResolvedValue({
        ...run,
        status: 'FAILED',
      });

      await expect(
        service.run('SCHEDULED'),
      ).rejects.toThrow(
        'Reconciliation run failed: Database unavailable',
      );

      expect(
        prismaMock.reconciliationRun.update,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'run-7',
          },
          data: expect.objectContaining({
            status: 'FAILED',
          }),
        }),
      );
    },
  );

  it(
  'should create a REVIEW_REQUIRED record when a payment is missing its Razorpay payment ID',
  async () => {
    const payment = {
      id: 'payment-without-razorpay-id',
      razorpayPaymentId: null,
      razorpayOrderId: 'order_123',
      amountInPaise: 10000,
      currency: 'INR',
      status: 'PENDING',
    };

    prismaMock.paymentTransaction.findMany.mockResolvedValue([
      payment,
    ]);

    prismaMock.refund.findMany.mockResolvedValue([]);

    prismaMock.reconciliationRun.create.mockResolvedValue({
      id: 'run-missing-reference',
      mode: 'SCHEDULED',
      status: 'RUNNING',
      startedAt: new Date(),
      completedAt: null,
      windowStart: null,
      windowEnd: null,
      totalChecked: 0,
      matchedCount: 0,
      mismatchCount: 0,
      autoResolvedCount: 0,
      reviewRequiredCount: 0,
      errorCount: 0,
    });

    prismaMock.reconciliationRecord.create.mockResolvedValue({
      id: 'record-missing-reference',
      reconciliationRunId: 'run-missing-reference',
      paymentTransactionId: payment.id,
      refundId: null,
      entityType: 'PAYMENT',
      entityExternalId: payment.id,
      mismatchType: 'MISSING_EXTERNAL_REFERENCE',
      localState: 'PENDING',
      externalState: null,
      localAmountInPaise: 10000,
      externalAmountInPaise: null,
      localCurrency: 'INR',
      externalCurrency: null,
      action: 'FLAG_REVIEW',
      resolutionStatus: 'REVIEW_REQUIRED',
      oldLocalState: null,
      newLocalState: null,
      resolutionRule: null,
      resolutionReason:
        'Local payment transaction is missing its Razorpay payment reference.',
      errorCode: 'MISSING_EXTERNAL_REFERENCE',
      errorMessage:
        'PaymentTransaction does not contain a Razorpay payment ID.',
      createdAt: new Date(),
      resolvedAt: null,
    });

    prismaMock.reconciliationRecord.findMany.mockResolvedValue([
      {
        resolutionStatus: 'REVIEW_REQUIRED',
      },
    ]);

    prismaMock.reconciliationRun.update.mockResolvedValue({
      id: 'run-missing-reference',
      mode: 'SCHEDULED',
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      windowStart: null,
      windowEnd: null,
      totalChecked: 1,
      matchedCount: 0,
      mismatchCount: 1,
      autoResolvedCount: 0,
      reviewRequiredCount: 1,
      errorCount: 0,
    });

    prismaMock.reconciliationRun.findUnique.mockResolvedValue({
      id: 'run-missing-reference',
      mode: 'SCHEDULED',
      status: 'COMPLETED',
      startedAt: new Date(),
      completedAt: new Date(),
      windowStart: null,
      windowEnd: null,
      totalChecked: 1,
      matchedCount: 0,
      mismatchCount: 1,
      autoResolvedCount: 0,
      reviewRequiredCount: 1,
      errorCount: 0,
      records: [
        {
          mismatchType: 'MISSING_EXTERNAL_REFERENCE',
          resolutionStatus: 'REVIEW_REQUIRED',
        },
      ],
    });

    const result = await service.run('SCHEDULED');

   expect(
  prismaMock.reconciliationRecord.create,
).toHaveBeenCalledWith({
  data: expect.objectContaining({
    paymentTransactionId: payment.id,
    entityType: 'PAYMENT',
    entityExternalId: payment.id,
    mismatchType: 'MISSING_EXTERNAL_REFERENCE',
    action: 'FLAG_REVIEW',
    resolutionStatus: 'REVIEW_REQUIRED',
  }),
});

    expect(
      prismaMock.reconciliationRecord.create,
    ).toHaveBeenCalledTimes(1);

    expect(result).toBeDefined();
  },
);

it(
  'should create a REVIEW_REQUIRED record when an external payment has no local record',
  async () => {
    const run = {
      id: 'run-external-only',
      mode: 'SCHEDULED',
      status: 'RUNNING',
    };

    const externalPayment = {
      id: 'pay_external_123',
      orderId: 'order_external_123',
      amountInPaise: 15000,
      currency: 'INR',
      status: 'captured',
      createdAt: new Date(),
    };

    prismaMock.reconciliationRun.create.mockResolvedValue(
      run,
    );

    prismaMock.paymentTransaction.findMany.mockResolvedValue(
      [],
    );

    prismaMock.refund.findMany.mockResolvedValue([]);

    providerMock.fetchPayments.mockResolvedValue([
      externalPayment,
    ]);

    prismaMock.paymentTransaction.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    prismaMock.reconciliationRecord.create.mockResolvedValue({
      id: 'external-only-record',
    });

    prismaMock.reconciliationRecord.findMany.mockResolvedValue([
      {
        resolutionStatus: 'REVIEW_REQUIRED',
      },
    ]);

    prismaMock.reconciliationRun.update.mockResolvedValue({
      ...run,
      status: 'COMPLETED',
    });

    prismaMock.reconciliationRun.findUnique.mockResolvedValue({
      ...run,
      status: 'COMPLETED',
      records: [
        {
          id: 'external-only-record',
          mismatchType: 'LOCAL_RECORD_MISSING',
          resolutionStatus: 'REVIEW_REQUIRED',
        },
      ],
    });

    const result = await service.run(
      'SCHEDULED',
    );

    expect(
      providerMock.fetchPayments,
    ).toHaveBeenCalledTimes(1);

    expect(
      prismaMock.reconciliationRecord.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reconciliationRunId:
          'run-external-only',

        entityType: 'PAYMENT',

        entityExternalId:
          'pay_external_123',

        mismatchType:
          'LOCAL_RECORD_MISSING',

        externalState:
          'captured',

        externalAmountInPaise:
          15000,

        externalCurrency:
          'INR',

        action:
          'FLAG_REVIEW',

        resolutionStatus:
          'REVIEW_REQUIRED',

        errorCode:
          'LOCAL_RECORD_MISSING',
      }),
    });

    expect(result).toBeDefined();
  },
);
});