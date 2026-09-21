import { ReconciliationMatcher } from './reconciliation-matcher.service';

describe('ReconciliationMatcher', () => {
  let matcher: ReconciliationMatcher;

  beforeEach(() => {
    matcher = new ReconciliationMatcher();
  });

  it('should match a captured payment with local PAID state', () => {
    const result = matcher.matchPayment(
      {
        id: 'pt-1',
        razorpayPaymentId: 'pay-1',
        razorpayOrderId: 'order-1',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'PAID',
      },
      {
        id: 'pay-1',
        orderId: 'order-1',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'captured',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MATCHED');
    expect(result.mismatchTypes).toEqual([]);
    expect(result.verification).toEqual({
      identityMatched: true,
      mappingMatched: true,
      amountMatched: true,
      currencyMatched: true,
      statusMatched: true,
    });
  });

  it('should detect pending vs captured payment status mismatch', () => {
    const result = matcher.matchPayment(
      {
        id: 'pt-2',
        razorpayPaymentId: 'pay-2',
        razorpayOrderId: 'order-2',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'PENDING',
      },
      {
        id: 'pay-2',
        orderId: 'order-2',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'captured',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchType).toBe('STATUS_MISMATCH');
    expect(result.verification.statusMatched).toBe(false);
  });

  it('should detect payment amount mismatch', () => {
    const result = matcher.matchPayment(
      {
        id: 'pt-3',
        razorpayPaymentId: 'pay-3',
        razorpayOrderId: 'order-3',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'PAID',
      },
      {
        id: 'pay-3',
        orderId: 'order-3',
        amountInPaise: 45000,
        currency: 'INR',
        status: 'captured',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchTypes).toContain(
      'AMOUNT_MISMATCH',
    );
  });

  it('should detect payment identity mismatch', () => {
    const result = matcher.matchPayment(
      {
        id: 'pt-4',
        razorpayPaymentId: 'pay-local',
        razorpayOrderId: 'order-4',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'PAID',
      },
      {
        id: 'pay-external',
        orderId: 'order-4',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'captured',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchTypes).toContain(
      'IDENTITY_MISMATCH',
    );
  });

  it('should detect missing external payment reference', () => {
    const result = matcher.matchPayment(
      {
        id: 'pt-5',
        razorpayPaymentId: null,
        razorpayOrderId: 'order-5',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'PENDING',
      },
      {
        id: 'pay-5',
        orderId: 'order-5',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'captured',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchType).toBe(
      'MISSING_EXTERNAL_REFERENCE',
    );
  });

  it('should match a processed refund', () => {
    const result = matcher.matchRefund(
      {
        id: 'refund-local-1',
        razorpayRefundId: 'rfnd-1',
        razorpayPaymentId: 'pay-1',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'PROCESSED',
      },
      {
        id: 'rfnd-1',
        paymentId: 'pay-1',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'processed',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MATCHED');
  });

  it('should detect refund status mismatch', () => {
    const result = matcher.matchRefund(
      {
        id: 'refund-local-2',
        razorpayRefundId: 'rfnd-2',
        razorpayPaymentId: 'pay-2',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'PENDING',
      },
      {
        id: 'rfnd-2',
        paymentId: 'pay-2',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'processed',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchType).toBe(
      'REFUND_STATUS_MISMATCH',
    );
  });

  it('should detect refund amount mismatch', () => {
    const result = matcher.matchRefund(
      {
        id: 'refund-local-3',
        razorpayRefundId: 'rfnd-3',
        razorpayPaymentId: 'pay-3',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'PROCESSED',
      },
      {
        id: 'rfnd-3',
        paymentId: 'pay-3',
        amountInPaise: 15000,
        currency: 'INR',
        status: 'processed',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchType).toBe(
      'REFUND_AMOUNT_MISMATCH',
    );
  });

  it('should detect external refund with missing local record', () => {
    const result = matcher.matchRefund(
      null,
      {
        id: 'rfnd-orphan',
        paymentId: 'pay-orphan',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'processed',
        createdAt: null,
      },
    );

    expect(result.resultStatus).toBe('MISMATCH');
    expect(result.mismatchType).toBe(
      'LOCAL_RECORD_MISSING',
    );
  });
});