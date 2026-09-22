import { jest } from '@jest/globals';

import { ReconciliationResolutionService } from './reconciliation-resolution.service';
import { ReconciliationResolver } from './reconciliation-resolver.service';
import {
  ReconciliationMatchResult,
} from './types/reconciliation-match-result.type';

describe('ReconciliationResolutionService', () => {
  let service: ReconciliationResolutionService;

  const txMock = {
    paymentTransaction: {
      findUnique: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
    },

    refund: {
      findUnique: jest.fn<() => Promise<unknown>>(),
      update: jest.fn<() => Promise<unknown>>(),
    },

    reconciliationRecord: {
      findUnique: jest.fn<() => Promise<unknown>>(),
      create: jest.fn<() => Promise<unknown>>(),
    },
  };

  const prismaMock = {
    $transaction: jest.fn<
      (
        callback: (tx: typeof txMock) => unknown,
      ) => Promise<unknown>
    >(),
  };

  const resolverMock = {
    resolve: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ReconciliationResolutionService(
      prismaMock as any,
      resolverMock as any,
    );

    prismaMock.$transaction.mockImplementation(
      async (callback: (tx: typeof txMock) => unknown) =>
        callback(txMock),
    );
  });

  // ============================================================
  // PAYMENT RECONCILIATION TESTS
  // ============================================================

  it(
    'should create a matched reconciliation record without changing payment state',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const result: ReconciliationMatchResult = {
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
        reason: 'Local and external payment records match',
      };

      const resolution = {
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: 'PAID',
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      };

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-1',
        reconciliationRunId: 'run-1',
        paymentTransactionId: 'payment-tx-1',
      });

      resolverMock.resolve.mockReturnValue(resolution);

      const response = await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(response.id).toBe('record-1');

      expect(
        txMock.paymentTransaction.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it(
    'should auto-resolve a payment status mismatch',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PENDING',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MISMATCH',
        mismatchType: 'STATUS_MISMATCH',
        mismatchTypes: ['STATUS_MISMATCH'],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: false,
        },
        localState: 'PENDING',
        externalState: 'captured',
        reason: 'Payment status mismatch detected',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'AUTO_RESOLVE',
        resolutionStatus: 'AUTO_RESOLVED',
        newLocalState: 'PAID',
        resolutionRule:
          'SYNC_PAYMENT_STATUS_FROM_EXTERNAL',
        resolutionReason:
          'Only the provider status differs',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.paymentTransaction.update.mockResolvedValue({
        ...payment,
        status: 'PAID',
      });

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-2',
      });

      await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(
        txMock.paymentTransaction.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 'payment-tx-1',
        },
        data: {
          status: 'PAID',
        },
      });
    },
  );

  it(
    'should not update payment for an amount mismatch',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MISMATCH',
        mismatchType: 'AMOUNT_MISMATCH',
        mismatchTypes: ['AMOUNT_MISMATCH'],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: false,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PAID',
        externalState: 'captured',
        reason: 'Payment amount mismatch detected',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        newLocalState: 'PAID',
        resolutionRule: null,
        resolutionReason:
          'Automatic resolution is not safe',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-3',
      });

      await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(
        txMock.paymentTransaction.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledTimes(1);
    },
  );

  it(
    'should not update payment for an identity mismatch',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MISMATCH',
        mismatchType: 'IDENTITY_MISMATCH',
        mismatchTypes: ['IDENTITY_MISMATCH'],
        verification: {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PAID',
        externalState: 'captured',
        reason: 'Payment identity mismatch detected',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        newLocalState: 'PAID',
        resolutionRule: null,
        resolutionReason:
          'Identity mismatch requires review',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-4',
      });

      await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(
        txMock.paymentTransaction.update,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'should return the existing record for an idempotent retry',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const existingRecord = {
        id: 'record-existing',
        reconciliationRunId: 'run-1',
        paymentTransactionId: 'payment-tx-1',
      };

      const result: ReconciliationMatchResult = {
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
        reason: 'Already matched',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: 'PAID',
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        existingRecord,
      );

      const response = await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(response).toEqual(existingRecord);

      expect(
        txMock.reconciliationRecord.create,
      ).not.toHaveBeenCalled();

      expect(
        txMock.paymentTransaction.update,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'should throw when payment transaction does not exist',
    async () => {
      const result: ReconciliationMatchResult = {
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

      resolverMock.resolve.mockReturnValue({
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: 'PAID',
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.resolvePayment(
          'run-1',
          'missing-payment',
          result,
        ),
      ).rejects.toThrow(
        'Payment transaction missing-payment not found',
      );

      expect(
        txMock.reconciliationRecord.findUnique,
      ).not.toHaveBeenCalled();
    },
  );

  it(
    'should persist old and new local states for auto-resolution',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: 'pay_123',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PENDING',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MISMATCH',
        mismatchType: 'STATUS_MISMATCH',
        mismatchTypes: ['STATUS_MISMATCH'],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: false,
        },
        localState: 'PENDING',
        externalState: 'captured',
        reason: 'Payment status mismatch',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'AUTO_RESOLVE',
        resolutionStatus: 'AUTO_RESOLVED',
        newLocalState: 'PAID',
        resolutionRule:
          'SYNC_PAYMENT_STATUS_FROM_EXTERNAL',
        resolutionReason:
          'Safe status synchronization',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.paymentTransaction.update.mockResolvedValue({
        ...payment,
        status: 'PAID',
      });

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-5',
      });

      await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            oldLocalState: 'PENDING',
            newLocalState: 'PAID',
            resolutionRule:
              'SYNC_PAYMENT_STATUS_FROM_EXTERNAL',
            resolutionStatus: 'AUTO_RESOLVED',
          }),
        }),
      );
    },
  );

  it(
    'should flag missing external reference without changing payment state',
    async () => {
      const payment = {
        id: 'payment-tx-1',
        razorpayPaymentId: null,
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PENDING',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MISMATCH',
        mismatchType: 'MISSING_EXTERNAL_REFERENCE',
        mismatchTypes: [
          'MISSING_EXTERNAL_REFERENCE',
          'EXTERNAL_RECORD_MISSING',
        ],
        verification: {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        localState: 'PENDING',
        externalState: null,
        reason: 'Missing external reference',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        newLocalState: 'PENDING',
        resolutionRule: null,
        resolutionReason:
          'Automatic resolution is not safe',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-6',
      });

      await service.resolvePayment(
        'run-1',
        'payment-tx-1',
        result,
      );

      expect(
        txMock.paymentTransaction.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'FLAG_REVIEW',
            resolutionStatus: 'REVIEW_REQUIRED',
          }),
        }),
      );
    },
  );

    it(
    'should flag PAID payment with external failed status for review without changing payment state',
    async () => {
      const payment = {
        id: 'payment-tx-paid-failed',
        razorpayPaymentId: 'pay_paid_failed',
        amountInPaise: 18000,
        currency: 'INR',
        status: 'PAID',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'PAYMENT',
        resultStatus: 'MISMATCH',
        mismatchType: 'STATUS_MISMATCH',
        mismatchTypes: ['STATUS_MISMATCH'],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: false,
        },
        localState: 'PAID',
        externalState: 'failed',
        reason:
          'Local payment is PAID but external payment is failed',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        newLocalState: 'PAID',
        resolutionRule: null,
        resolutionReason:
          'Automatic resolution is not safe for PAID payment with external failed status',
      });

      txMock.paymentTransaction.findUnique.mockResolvedValue(
        payment,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-paid-failed-review',
        reconciliationRunId: 'run-1',
        paymentTransactionId:
          'payment-tx-paid-failed',
      });

      const response = await service.resolvePayment(
        'run-1',
        'payment-tx-paid-failed',
        result,
      );

      expect(
        txMock.paymentTransaction.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reconciliationRunId: 'run-1',
            paymentTransactionId:
              'payment-tx-paid-failed',
            entityType: 'PAYMENT',
            mismatchType: 'STATUS_MISMATCH',
            localState: 'PAID',
            externalState: 'failed',
            action: 'FLAG_REVIEW',
            resolutionStatus: 'REVIEW_REQUIRED',
            oldLocalState: 'PAID',
            newLocalState: 'PAID',
            resolutionRule: null,
            resolvedAt: null,
          }),
        }),
      );

      expect(response).toEqual({
        id: 'record-paid-failed-review',
        reconciliationRunId: 'run-1',
        paymentTransactionId:
          'payment-tx-paid-failed',
      });
    },
  );

  // ============================================================
  // REFUND RECONCILIATION TESTS
  // ============================================================

  it(
    'should resolve a matched refund without changing its state',
    async () => {
      const refundId = 'refund-1';

      const refund = {
        id: refundId,
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_123',
        amountInPaise: 9000,
        status: 'PROCESSED',
      };

      const result: ReconciliationMatchResult = {
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
        reason: 'Local and external refund records match',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: 'PROCESSED',
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      });

      txMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-refund-1',
      });

      const response = await service.resolveRefund(
        'run-1',
        refundId,
        result,
      );

      expect(response.id).toBe(
        'record-refund-1',
      );

      expect(
        txMock.refund.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reconciliationRunId: 'run-1',
            refundId,
            entityType: 'REFUND',
            entityExternalId: 'rfnd_123',
            mismatchType: 'NONE',
            action: 'NONE',
            resolutionStatus: 'MATCHED',
            oldLocalState: 'PROCESSED',
            newLocalState: 'PROCESSED',
          }),
        }),
      );
    },
  );

  it(
    'should auto-resolve a safe refund status mismatch',
    async () => {
      const refundId = 'refund-2';

      const refund = {
        id: refundId,
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_456',
        amountInPaise: 9000,
        status: 'PENDING',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'REFUND',
        resultStatus: 'MISMATCH',
        mismatchType: 'REFUND_STATUS_MISMATCH',
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
        reason: 'External refund is processed',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'AUTO_RESOLVE',
        resolutionStatus: 'AUTO_RESOLVED',
        newLocalState: 'PROCESSED',
        resolutionRule:
          'SYNC_REFUND_STATUS_FROM_EXTERNAL',
        resolutionReason:
          'Only the provider refund status differs',
      });

      txMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.refund.update.mockResolvedValue({
        ...refund,
        status: 'PROCESSED',
      });

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-refund-2',
      });

      const response = await service.resolveRefund(
        'run-1',
        refundId,
        result,
      );

      expect(
        txMock.refund.update,
      ).toHaveBeenCalledWith({
        where: {
          id: refundId,
        },
        data: {
          status: 'PROCESSED',
        },
      });

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AUTO_RESOLVE',
            resolutionStatus: 'AUTO_RESOLVED',
            oldLocalState: 'PENDING',
            newLocalState: 'PROCESSED',
          }),
        }),
      );

      expect(response).toEqual({
        id: 'record-refund-2',
      });
    },
  );

  it(
    'should flag a refund amount mismatch for review',
    async () => {
      const refundId = 'refund-3';

      const refund = {
        id: refundId,
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_789',
        amountInPaise: 9000,
        status: 'PROCESSED',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'REFUND',
        resultStatus: 'MISMATCH',
        mismatchType: 'REFUND_AMOUNT_MISMATCH',
        mismatchTypes: [
          'REFUND_AMOUNT_MISMATCH',
        ],
        verification: {
          identityMatched: true,
          mappingMatched: true,
          amountMatched: false,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PROCESSED',
        externalState: 'processed',
        reason: 'Refund amount differs',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        newLocalState: 'PROCESSED',
        resolutionRule: null,
        resolutionReason:
          'Automatic resolution is not safe',
      });

      txMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-refund-3',
      });

      const response = await service.resolveRefund(
        'run-1',
        refundId,
        result,
      );

      expect(
        txMock.refund.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'FLAG_REVIEW',
            resolutionStatus: 'REVIEW_REQUIRED',
            mismatchType:
              'REFUND_AMOUNT_MISMATCH',
            newLocalState: 'PROCESSED',
          }),
        }),
      );

      expect(response).toEqual({
        id: 'record-refund-3',
      });
    },
  );

  it(
    'should flag a refund identity mismatch for review',
    async () => {
      const refundId = 'refund-4';

      const refund = {
        id: refundId,
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_111',
        amountInPaise: 9000,
        status: 'PROCESSED',
      };

      const result: ReconciliationMatchResult = {
        entityType: 'REFUND',
        resultStatus: 'MISMATCH',
        mismatchType: 'IDENTITY_MISMATCH',
        mismatchTypes: ['IDENTITY_MISMATCH'],
        verification: {
          identityMatched: false,
          mappingMatched: true,
          amountMatched: true,
          currencyMatched: true,
          statusMatched: true,
        },
        localState: 'PROCESSED',
        externalState: 'processed',
        reason: 'Refund identity mismatch',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        newLocalState: 'PROCESSED',
        resolutionRule: null,
        resolutionReason:
          'Identity mismatch requires review',
      });

      txMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        null,
      );

      txMock.reconciliationRecord.create.mockResolvedValue({
        id: 'record-refund-4',
      });

      const response = await service.resolveRefund(
        'run-1',
        refundId,
        result,
      );

      expect(
        txMock.refund.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'FLAG_REVIEW',
            resolutionStatus: 'REVIEW_REQUIRED',
            mismatchType: 'IDENTITY_MISMATCH',
          }),
        }),
      );

      expect(response).toEqual({
        id: 'record-refund-4',
      });
    },
  );

  it(
    'should return the existing refund reconciliation record',
    async () => {
      const refundId = 'refund-5';

      const refund = {
        id: refundId,
        paymentTransactionId: 'payment-tx-1',
        razorpayRefundId: 'rfnd_existing',
        amountInPaise: 9000,
        status: 'PROCESSED',
      };

      const existingRecord = {
        id: 'existing-refund-record',
        refundId,
        entityType: 'REFUND',
      };

      const result: ReconciliationMatchResult = {
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
        reason: 'Already reconciled',
      };

      resolverMock.resolve.mockReturnValue({
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: 'PROCESSED',
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      });

      txMock.refund.findUnique.mockResolvedValue(
        refund,
      );

      txMock.reconciliationRecord.findUnique.mockResolvedValue(
        existingRecord,
      );

      const response = await service.resolveRefund(
        'run-1',
        refundId,
        result,
      );

      expect(
        txMock.refund.update,
      ).not.toHaveBeenCalled();

      expect(
        txMock.reconciliationRecord.create,
      ).not.toHaveBeenCalled();

      expect(response).toEqual(
        existingRecord,
      );
    },
  );

  it(
    'should throw when refund does not exist',
    async () => {
      const result: ReconciliationMatchResult = {
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

      resolverMock.resolve.mockReturnValue({
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: 'PROCESSED',
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      });

      txMock.refund.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.resolveRefund(
          'run-1',
          'missing-refund',
          result,
        ),
      ).rejects.toThrow(
        'Refund missing-refund not found',
      );

      expect(
        txMock.reconciliationRecord.findUnique,
      ).not.toHaveBeenCalled();
    },
  );
});