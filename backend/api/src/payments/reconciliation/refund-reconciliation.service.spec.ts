import { jest } from '@jest/globals';

import { RefundReconciliationService } from './refund-reconciliation.service';

describe('RefundReconciliationService', () => {
  let service: RefundReconciliationService;

  const prismaMock = {
    refund: {
      findUnique: jest.fn<() => Promise<unknown>>(),
    },
    reconciliationRecord: {
      create: jest.fn<() => Promise<unknown>>(),
    },
  };

  const providerMock = {
    fetchRefund: jest.fn<() => Promise<unknown>>(),
  };

  const matcherMock = {
    matchRefund: jest.fn(),
  };

  const resolutionServiceMock = {
    resolveRefund: jest.fn<() => Promise<unknown>>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new RefundReconciliationService(
      prismaMock as any,
      providerMock as any,
      matcherMock as any,
      resolutionServiceMock as any,
    );
  });

  // ============================================================
  // NORMAL REFUND RECONCILIATION
  // ============================================================

  it(
    'should fetch, match, and resolve a refund',
    async () => {
      const refund = {
        id: 'refund-1',
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_123',
        amountInPaise: 9000,
        status: 'PROCESSED',
      };

      const externalRefund = {
        id: 'rfnd_123',
        paymentId: 'pay_123',
        amountInPaise: 9000,
        currency: 'INR',
        status: 'processed',
        createdAt: new Date(),
      };

      const matchResult = {
        entityType: 'REFUND',
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
        localState: 'PROCESSED',
        externalState: 'processed',
        reason:
          'Local and external refund records match',
      };

      const resolutionRecord = {
        id: 'record-1',
        refundId: 'refund-1',
        entityType: 'REFUND',
        resolutionStatus: 'MATCHED',
      };

      prismaMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      providerMock.fetchRefund.mockResolvedValue(
        externalRefund,
      );

      matcherMock.matchRefund.mockReturnValue(
        matchResult,
      );

      resolutionServiceMock.resolveRefund.mockResolvedValue(
        resolutionRecord,
      );

      const result = await service.reconcileRefund(
        'run-1',
        'refund-1',
      );

      expect(
        prismaMock.refund.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: 'refund-1',
        },
      });

      expect(
        providerMock.fetchRefund,
      ).toHaveBeenCalledWith('rfnd_123');

      expect(
        matcherMock.matchRefund,
      ).toHaveBeenCalledWith(
        {
          id: 'refund-1',
          razorpayRefundId: 'rfnd_123',
          razorpayPaymentId: 'payment-tx-1',
          amountInPaise: 9000,
          currency: 'INR',
          status: 'PROCESSED',
        },
        externalRefund,
      );

      expect(
        resolutionServiceMock.resolveRefund,
      ).toHaveBeenCalledWith(
        'run-1',
        'refund-1',
        matchResult,
      );

      expect(result).toEqual(
        resolutionRecord,
      );
    },
  );

  // ============================================================
  // REFUND NOT FOUND
  // ============================================================

  it(
    'should throw when refund does not exist',
    async () => {
      prismaMock.refund.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.reconcileRefund(
          'run-1',
          'missing-refund',
        ),
      ).rejects.toThrow(
        'Refund missing-refund not found',
      );

      expect(
        providerMock.fetchRefund,
      ).not.toHaveBeenCalled();

      expect(
        resolutionServiceMock.resolveRefund,
      ).not.toHaveBeenCalled();
    },
  );

  // ============================================================
  // MISSING RAZORPAY REFUND ID
  // ============================================================

  it(
    'should create a review record when Razorpay refund ID is missing',
    async () => {
      const refund = {
        id: 'refund-2',
        paymentTransactionId: 'payment-tx-2',
        razorpayRefundId: null,
        amountInPaise: 5000,
        status: 'PENDING',
      };

      prismaMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      prismaMock.reconciliationRecord.create.mockResolvedValue(
        {
          id: 'record-2',
          refundId: 'refund-2',
          entityType: 'REFUND',
          mismatchType:
            'MISSING_EXTERNAL_REFERENCE',
          resolutionStatus: 'REVIEW_REQUIRED',
        },
      );

      const result = await service.reconcileRefund(
        'run-1',
        'refund-2',
      );

      expect(
        providerMock.fetchRefund,
      ).not.toHaveBeenCalled();

      expect(
        matcherMock.matchRefund,
      ).not.toHaveBeenCalled();

      expect(
        resolutionServiceMock.resolveRefund,
      ).not.toHaveBeenCalled();

      expect(
        prismaMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith({
        data: {
          reconciliationRunId: 'run-1',
          refundId: 'refund-2',
          entityType: 'REFUND',
          entityExternalId: 'refund-2',
          mismatchType:
            'MISSING_EXTERNAL_REFERENCE',
          localState: 'PENDING',
          externalState: null,
          localAmountInPaise: 5000,
          externalAmountInPaise: null,
          localCurrency: 'INR',
          externalCurrency: null,
          action: 'FLAG_REVIEW',
          resolutionStatus: 'REVIEW_REQUIRED',
          resolutionReason:
            'Refund does not have a Razorpay refund ID',
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'record-2',
        }),
      );
    },
  );

  // ============================================================
  // PROVIDER FAILURE
  // ============================================================

  it(
    'should create an ERROR record when Razorpay refund fetch fails',
    async () => {
      const refund = {
        id: 'refund-3',
        paymentTransactionId: 'payment-tx-3',
        razorpayRefundId: 'rfnd_789',
        amountInPaise: 7500,
        status: 'PENDING',
      };

      prismaMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      providerMock.fetchRefund.mockRejectedValue(
        new Error('Razorpay unavailable'),
      );

      prismaMock.reconciliationRecord.create.mockResolvedValue(
        {
          id: 'error-record-1',
        },
      );

      const result = await service.reconcileRefund(
        'run-1',
        'refund-3',
      );

      expect(
        providerMock.fetchRefund,
      ).toHaveBeenCalledWith('rfnd_789');

      expect(
        matcherMock.matchRefund,
      ).not.toHaveBeenCalled();

      expect(
        resolutionServiceMock.resolveRefund,
      ).not.toHaveBeenCalled();

      expect(
        prismaMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith({
        data: {
          reconciliationRunId: 'run-1',
          refundId: 'refund-3',
          entityType: 'REFUND',
          entityExternalId: 'rfnd_789',
          mismatchType: 'UNKNOWN',
          localState: 'PENDING',
          externalState: null,
          localAmountInPaise: 7500,
          externalAmountInPaise: null,
          localCurrency: 'INR',
          externalCurrency: null,
          action: 'NONE',
          resolutionStatus: 'ERROR',
          errorCode: 'RECONCILIATION_ERROR',
          errorMessage: 'Razorpay unavailable',
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'error-record-1',
        }),
      );
    },
  );

  // ============================================================
  // MATCHER MISMATCH → RESOLUTION
  // ============================================================

  it(
    'should pass refund mismatch result to the resolution service',
    async () => {
      const refund = {
        id: 'refund-4',
        paymentTransactionId: 'payment-tx-4',
        razorpayRefundId: 'rfnd_456',
        amountInPaise: 9000,
        status: 'PENDING',
      };

      const externalRefund = {
        id: 'rfnd_456',
        paymentId: 'pay_456',
        amountInPaise: 9000,
        currency: 'INR',
        status: 'processed',
        createdAt: new Date(),
      };

      const matchResult = {
        entityType: 'REFUND',
        resultStatus: 'MISMATCH',
        mismatchType:
          'REFUND_STATUS_MISMATCH',
        mismatchTypes: [
          'REFUND_STATUS_MISMATCH',
        ],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: false,
        },
        localState: 'PENDING',
        externalState: 'processed',
        reason:
          'External refund status differs',
      };

      const resolutionRecord = {
        id: 'record-4',
        refundId: 'refund-4',
        resolutionStatus: 'AUTO_RESOLVED',
      };

      prismaMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      providerMock.fetchRefund.mockResolvedValue(
        externalRefund,
      );

      matcherMock.matchRefund.mockReturnValue(
        matchResult,
      );

      resolutionServiceMock.resolveRefund.mockResolvedValue(
        resolutionRecord,
      );

      const result = await service.reconcileRefund(
        'run-1',
        'refund-4',
      );

      expect(
        matcherMock.matchRefund,
      ).toHaveBeenCalledTimes(1);

      expect(
        resolutionServiceMock.resolveRefund,
      ).toHaveBeenCalledWith(
        'run-1',
        'refund-4',
        matchResult,
      );

      expect(result).toEqual(
        resolutionRecord,
      );

      expect(
        prismaMock.reconciliationRecord.create,
      ).not.toHaveBeenCalled();
    },
  );

  // ============================================================
  // RESOLUTION SERVICE FAILURE
  // ============================================================

  it(
    'should create an ERROR record when refund resolution fails',
    async () => {
      const refund = {
        id: 'refund-5',
        paymentTransactionId: 'payment-tx-5',
        razorpayRefundId: 'rfnd_555',
        amountInPaise: 10000,
        status: 'PENDING',
      };

      const externalRefund = {
        id: 'rfnd_555',
        paymentId: 'pay_555',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'processed',
        createdAt: new Date(),
      };

      const matchResult = {
        entityType: 'REFUND',
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
        localState: 'PROCESSED',
        externalState: 'processed',
        reason: 'Refund matched',
      };

      prismaMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      providerMock.fetchRefund.mockResolvedValue(
        externalRefund,
      );

      matcherMock.matchRefund.mockReturnValue(
        matchResult,
      );

      resolutionServiceMock.resolveRefund.mockRejectedValue(
        new Error('Resolution failed'),
      );

      prismaMock.reconciliationRecord.create.mockResolvedValue(
        {
          id: 'error-record-2',
        },
      );

      const result = await service.reconcileRefund(
        'run-1',
        'refund-5',
      );

      expect(
        resolutionServiceMock.resolveRefund,
      ).toHaveBeenCalledWith(
        'run-1',
        'refund-5',
        matchResult,
      );

      expect(
        prismaMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith({
        data: {
          reconciliationRunId: 'run-1',
          refundId: 'refund-5',
          entityType: 'REFUND',
          entityExternalId: 'rfnd_555',
          mismatchType: 'UNKNOWN',
          localState: 'PENDING',
          externalState: null,
          localAmountInPaise: 10000,
          externalAmountInPaise: null,
          localCurrency: 'INR',
          externalCurrency: null,
          action: 'NONE',
          resolutionStatus: 'ERROR',
          errorCode: 'RECONCILIATION_ERROR',
          errorMessage: 'Resolution failed',
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'error-record-2',
        }),
      );
    },
  );
});