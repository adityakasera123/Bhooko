import { Injectable } from '@nestjs/common';

import {
  ExternalPaymentRecord,
  ExternalRefundRecord,
} from './types/reconciliation-provider.types';

import {
  PaymentReconciliationLocalRecord,
  RefundReconciliationLocalRecord,
  ReconciliationMatchResult,
  ReconciliationVerification,
  ReconciliationEntityType,
  ReconciliationMismatchType,
  ReconciliationResultStatus,
} from './types/reconciliation-match-result.type';

@Injectable()
export class ReconciliationMatcher {
  matchPayment(
    local: PaymentReconciliationLocalRecord | null,
    external: ExternalPaymentRecord | null,
  ): ReconciliationMatchResult {
    if (!local && !external) {
      return this.buildResult(
        'PAYMENT',
        ['UNKNOWN'],
        {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        null,
        null,
        'Both local and external payment records are missing',
      );
    }

    if (!local) {
      return this.buildResult(
        'PAYMENT',
        ['LOCAL_RECORD_MISSING'],
        {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        null,
        external?.status ?? null,
        'External payment exists but the local payment transaction is missing',
      );
    }

    if (!external) {
      const mismatchTypes: ReconciliationMismatchType[] =
        local.razorpayPaymentId === null
          ? [
              'MISSING_EXTERNAL_REFERENCE',
              'EXTERNAL_RECORD_MISSING',
            ]
          : ['EXTERNAL_RECORD_MISSING'];

      return this.buildResult(
        'PAYMENT',
        mismatchTypes,
        {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        local.status,
        null,
        'Local payment transaction has no matching external payment record',
      );
    }

    const identityMatched =
      local.razorpayPaymentId !== null &&
      local.razorpayPaymentId === external.id;

    const mappingMatched =
      local.razorpayOrderId !== null &&
      local.razorpayOrderId === external.orderId;

    const amountMatched =
      local.amountInPaise === external.amountInPaise;

    const currencyMatched =
      local.currency.toUpperCase() ===
      external.currency.toUpperCase();

    const externalStatus =
      this.normalizeExternalPaymentStatus(external.status);

    const localStatus =
      this.normalizeLocalPaymentStatus(local.status);

    const statusMatched =
      externalStatus !== null &&
      localStatus === externalStatus;

    const mismatchTypes: ReconciliationMismatchType[] = [];

    if (local.razorpayPaymentId === null) {
      mismatchTypes.push('MISSING_EXTERNAL_REFERENCE');
    } else if (!identityMatched) {
      mismatchTypes.push('IDENTITY_MISMATCH');
    }

    if (!mappingMatched) {
      mismatchTypes.push('IDENTITY_MISMATCH');
    }

    if (!amountMatched) {
      mismatchTypes.push('AMOUNT_MISMATCH');
    }

    if (!currencyMatched) {
      mismatchTypes.push('CURRENCY_MISMATCH');
    }

    if (!statusMatched) {
      mismatchTypes.push(
        externalStatus === null
          ? 'UNKNOWN'
          : 'STATUS_MISMATCH',
      );
    }

    const uniqueMismatchTypes = [
      ...new Set(mismatchTypes),
    ];

    return this.buildResult(
      'PAYMENT',
      uniqueMismatchTypes,
      {
        identityMatched,
        mappingMatched,
        amountMatched,
        currencyMatched,
        statusMatched,
      },
      local.status,
      external.status,
      uniqueMismatchTypes.length === 0
        ? 'Local and external payment records match'
        : `Payment mismatch detected: ${uniqueMismatchTypes.join(', ')}`,
    );
  }

  matchRefund(
    local: RefundReconciliationLocalRecord | null,
    external: ExternalRefundRecord | null,
  ): ReconciliationMatchResult {
    if (!local && !external) {
      return this.buildResult(
        'REFUND',
        ['UNKNOWN'],
        {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        null,
        null,
        'Both local and external refund records are missing',
      );
    }

    if (!local) {
      return this.buildResult(
        'REFUND',
        ['LOCAL_RECORD_MISSING'],
        {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        null,
        external?.status ?? null,
        'External refund exists but the local refund record is missing',
      );
    }

    if (!external) {
      const mismatchTypes: ReconciliationMismatchType[] =
        local.razorpayRefundId === null
          ? [
              'MISSING_EXTERNAL_REFERENCE',
              'EXTERNAL_RECORD_MISSING',
            ]
          : ['EXTERNAL_RECORD_MISSING'];

      return this.buildResult(
        'REFUND',
        mismatchTypes,
        {
          identityMatched: false,
          mappingMatched: false,
          amountMatched: false,
          currencyMatched: false,
          statusMatched: false,
        },
        local.status,
        null,
        'Local refund has no matching external refund record',
      );
    }

    const identityMatched =
      local.razorpayRefundId !== null &&
      local.razorpayRefundId === external.id;

    const mappingMatched =
      local.razorpayPaymentId !== null &&
      local.razorpayPaymentId === external.paymentId;

    const amountMatched =
      local.amountInPaise === external.amountInPaise;

    const currencyMatched =
      local.currency.toUpperCase() ===
      external.currency.toUpperCase();

    const externalStatus =
      this.normalizeExternalRefundStatus(external.status);

    const localStatus =
      this.normalizeLocalRefundStatus(local.status);

    const statusMatched =
      externalStatus !== null &&
      localStatus === externalStatus;

    const mismatchTypes: ReconciliationMismatchType[] = [];

    if (local.razorpayRefundId === null) {
      mismatchTypes.push('MISSING_EXTERNAL_REFERENCE');
    } else if (!identityMatched) {
      mismatchTypes.push('IDENTITY_MISMATCH');
    }

    if (!mappingMatched) {
      mismatchTypes.push('IDENTITY_MISMATCH');
    }

    if (!amountMatched) {
      mismatchTypes.push('REFUND_AMOUNT_MISMATCH');
    }

    if (!currencyMatched) {
      mismatchTypes.push('CURRENCY_MISMATCH');
    }

    if (!statusMatched) {
      mismatchTypes.push(
        externalStatus === null
          ? 'UNKNOWN'
          : 'REFUND_STATUS_MISMATCH',
      );
    }

    const uniqueMismatchTypes = [
      ...new Set(mismatchTypes),
    ];

    return this.buildResult(
      'REFUND',
      uniqueMismatchTypes,
      {
        identityMatched,
        mappingMatched,
        amountMatched,
        currencyMatched,
        statusMatched,
      },
      local.status,
      external.status,
      uniqueMismatchTypes.length === 0
        ? 'Local and external refund records match'
        : `Refund mismatch detected: ${uniqueMismatchTypes.join(', ')}`,
    );
  }

  private normalizeExternalPaymentStatus(
    status: string,
  ): string | null {
    switch (status.toLowerCase()) {
      case 'created':
      case 'authorized':
        return 'PENDING';

      case 'captured':
        return 'PAID';

      case 'failed':
        return 'FAILED';

      case 'refunded':
        return 'REFUNDED';

      default:
        return null;
    }
  }

  private normalizeLocalPaymentStatus(
    status: string,
  ): string | null {
    switch (status) {
      case 'CREATED':
      case 'PENDING':
        return 'PENDING';

      case 'PAID':
      case 'REFUND_PENDING':
        return 'PAID';

      case 'FAILED':
        return 'FAILED';

      case 'REFUNDED':
        return 'REFUNDED';

      default:
        return null;
    }
  }

  private normalizeExternalRefundStatus(
    status: string,
  ): string | null {
    switch (status.toLowerCase()) {
      case 'created':
      case 'pending':
        return 'PENDING';

      case 'processed':
        return 'PROCESSED';

      case 'failed':
        return 'FAILED';

      default:
        return null;
    }
  }

  private normalizeLocalRefundStatus(
    status: string,
  ): string | null {
    switch (status) {
      case 'PENDING':
        return 'PENDING';

      case 'PROCESSED':
        return 'PROCESSED';

      case 'FAILED':
        return 'FAILED';

      default:
        return null;
    }
  }

  private buildResult(
    entityType: ReconciliationEntityType,
    mismatchTypes: ReconciliationMismatchType[],
    verification: ReconciliationVerification,
    localState: string | null,
    externalState: string | null,
    reason: string,
  ): ReconciliationMatchResult {
    const isMatched = mismatchTypes.length === 0;

    return {
      entityType,
      resultStatus: isMatched
        ? 'MATCHED'
        : 'MISMATCH',
      mismatchType:
        mismatchTypes[0] ?? 'NONE',
      mismatchTypes,
      verification,
      localState,
      externalState,
      reason,
    };
  }
}