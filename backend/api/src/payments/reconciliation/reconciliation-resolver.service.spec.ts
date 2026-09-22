

import { ReconciliationResolver } from './reconciliation-resolver.service';
import {
  ReconciliationMatchResult,
} from './types/reconciliation-match-result.type';

describe('ReconciliationResolver', () => {
  let resolver: ReconciliationResolver;

  beforeEach(() => {
    resolver = new ReconciliationResolver();
  });

  it('should keep matched payment unchanged', () => {
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

    expect(resolver.resolve(result)).toEqual({
      action: 'NONE',
      resolutionStatus: 'MATCHED',
      newLocalState: 'PAID',
      resolutionRule: null,
      resolutionReason:
        'Local and external records already match',
    });
  });

  it('should auto-resolve payment status mismatch', () => {
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

    const resolution = resolver.resolve(result);

    expect(resolution.action).toBe('AUTO_RESOLVE');
    expect(resolution.resolutionStatus).toBe(
      'AUTO_RESOLVED',
    );
    expect(resolution.newLocalState).toBe('PAID');
    expect(resolution.resolutionRule).toBe(
      'SYNC_PAYMENT_STATUS_FROM_EXTERNAL',
    );
  });

  it('should auto-resolve failed payment status mismatch', () => {
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
      externalState: 'failed',
      reason: 'Payment status mismatch detected',
    };

    expect(resolver.resolve(result).newLocalState).toBe(
      'FAILED',
    );
  });

  it('should auto-resolve refunded payment status mismatch', () => {
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
      externalState: 'refunded',
      reason: 'Payment status mismatch detected',
    };

    expect(resolver.resolve(result).newLocalState).toBe(
      'REFUNDED',
    );
  });

  it('should auto-resolve refund status mismatch', () => {
    const result: ReconciliationMatchResult = {
      entityType: 'REFUND',
      resultStatus: 'MISMATCH',
      mismatchType: 'REFUND_STATUS_MISMATCH',
      mismatchTypes: ['REFUND_STATUS_MISMATCH'],
      verification: {
        identityMatched: true,
        mappingMatched: true,
        amountMatched: true,
        currencyMatched: true,
        statusMatched: false,
      },
      localState: 'PENDING',
      externalState: 'processed',
      reason: 'Refund status mismatch detected',
    };

    const resolution = resolver.resolve(result);

    expect(resolution.action).toBe('AUTO_RESOLVE');
    expect(resolution.resolutionStatus).toBe(
      'AUTO_RESOLVED',
    );
    expect(resolution.newLocalState).toBe('PROCESSED');
    expect(resolution.resolutionRule).toBe(
      'SYNC_REFUND_STATUS_FROM_EXTERNAL',
    );
  });

  it('should flag amount mismatch for review', () => {
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

    const resolution = resolver.resolve(result);

    expect(resolution.action).toBe('FLAG_REVIEW');
    expect(resolution.resolutionStatus).toBe(
      'REVIEW_REQUIRED',
    );
    expect(resolution.newLocalState).toBe('PAID');
  });

  it('should flag identity mismatch for review', () => {
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

    expect(resolver.resolve(result).action).toBe(
      'FLAG_REVIEW',
    );
  });

  it('should flag missing external record for review', () => {
    const result: ReconciliationMatchResult = {
      entityType: 'PAYMENT',
      resultStatus: 'MISMATCH',
      mismatchType: 'EXTERNAL_RECORD_MISSING',
      mismatchTypes: ['EXTERNAL_RECORD_MISSING'],
      verification: {
        identityMatched: false,
        mappingMatched: false,
        amountMatched: false,
        currencyMatched: false,
        statusMatched: false,
      },
      localState: 'PAID',
      externalState: null,
      reason: 'External payment record is missing',
    };

    expect(resolver.resolve(result).action).toBe(
      'FLAG_REVIEW',
    );
  });

  it('should not auto-resolve when status mismatch is combined with amount mismatch', () => {
    const result: ReconciliationMatchResult = {
      entityType: 'PAYMENT',
      resultStatus: 'MISMATCH',
      mismatchType: 'STATUS_MISMATCH',
      mismatchTypes: [
        'STATUS_MISMATCH',
        'AMOUNT_MISMATCH',
      ],
      verification: {
        identityMatched: true,
        mappingMatched: true,
        amountMatched: false,
        currencyMatched: true,
        statusMatched: false,
      },
      localState: 'PENDING',
      externalState: 'captured',
      reason: 'Multiple mismatches detected',
    };

    expect(resolver.resolve(result).action).toBe(
      'FLAG_REVIEW',
    );
  });
  
  it('should flag PAID payment with external failed status for review', () => {
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
      reason: 'Payment status mismatch detected',
    };

    const resolution = resolver.resolve(result);

    expect(resolution.action).toBe('FLAG_REVIEW');
    expect(resolution.resolutionStatus).toBe(
      'REVIEW_REQUIRED',
    );
    expect(resolution.newLocalState).toBe('PAID');
    expect(resolution.resolutionRule).toBeNull();
  });

  it('should flag unknown external status for review', () => {
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
      externalState: 'unknown_status',
      reason: 'Unknown provider status',
    };

    const resolution = resolver.resolve(result);

    expect(resolution.action).toBe('FLAG_REVIEW');
    expect(resolution.newLocalState).toBe('PENDING');
  });
});