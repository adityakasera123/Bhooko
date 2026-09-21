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
});