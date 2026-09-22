import { Injectable } from '@nestjs/common';

import {
  ReconciliationMatchResult,
  ReconciliationMismatchType,
} from './types/reconciliation-match-result.type';

export interface ReconciliationResolution {
  action: 'NONE' | 'AUTO_RESOLVE' | 'FLAG_REVIEW';
  resolutionStatus:
    | 'MATCHED'
    | 'AUTO_RESOLVED'
    | 'REVIEW_REQUIRED';
  newLocalState: string | null;
  resolutionRule: string | null;
  resolutionReason: string;
}

@Injectable()
export class ReconciliationResolver {
  resolve(
    result: ReconciliationMatchResult,
  ): ReconciliationResolution {
    if (result.resultStatus === 'MATCHED') {
      return {
        action: 'NONE',
        resolutionStatus: 'MATCHED',
        newLocalState: result.localState,
        resolutionRule: null,
        resolutionReason:
          'Local and external records already match',
      };
    }

    if (this.hasOnlyStatusMismatch(result)) {
      return this.resolveStatusMismatch(result);
    }

    return this.flagForReview(result);
  }

  private hasOnlyStatusMismatch(
    result: ReconciliationMatchResult,
  ): boolean {
    if (result.mismatchTypes.length !== 1) {
      return false;
    }

    return (
      result.mismatchTypes[0] === 'STATUS_MISMATCH' ||
      result.mismatchTypes[0] === 'REFUND_STATUS_MISMATCH'
    );
  }

  private resolveStatusMismatch(
    result: ReconciliationMatchResult,
  ): ReconciliationResolution {
    if (
      result.localState === null ||
      result.externalState === null
    ) {
      return this.flagForReview(result);
    }

    const newLocalState = this.getSafeLocalState(
      result.externalState,
      result.entityType,
      result.localState,
    );

    if (newLocalState === null) {
      return this.flagForReview(result);
    }

    return {
      action: 'AUTO_RESOLVE',
      resolutionStatus: 'AUTO_RESOLVED',
      newLocalState,
      resolutionRule:
        result.entityType === 'PAYMENT'
          ? 'SYNC_PAYMENT_STATUS_FROM_EXTERNAL'
          : 'SYNC_REFUND_STATUS_FROM_EXTERNAL',
      resolutionReason:
        'Only the provider status differs and identity, mapping, amount, and currency have already been verified by the matcher',
    };
  }

  private getSafeLocalState(
    externalState: string,
    entityType: 'PAYMENT' | 'REFUND',
    localState: string,
  ): string | null {
    if (entityType === 'PAYMENT') {
      switch (externalState.toLowerCase()) {
        case 'captured':
          return localState === 'PENDING'
            ? 'PAID'
            : null;

        case 'failed':
          return localState === 'PENDING'
            ? 'FAILED'
            : null;

        case 'refunded':
          return localState === 'PAID'
            ? 'REFUNDED'
            : null;

        default:
          return null;
      }
    }

    switch (externalState.toLowerCase()) {
      case 'processed':
        return 'PROCESSED';

      case 'failed':
        return 'FAILED';

      case 'pending':
      case 'created':
        return 'PENDING';

      default:
        return null;
    }
  }

  private flagForReview(
    result: ReconciliationMatchResult,
  ): ReconciliationResolution {
    return {
      action: 'FLAG_REVIEW',
      resolutionStatus: 'REVIEW_REQUIRED',
      newLocalState: result.localState,
      resolutionRule: null,
      resolutionReason: this.buildReviewReason(
        result.mismatchTypes,
      ),
    };
  }

  private buildReviewReason(
    mismatchTypes: ReconciliationMismatchType[],
  ): string {
    return `Automatic resolution is not safe for mismatch types: ${mismatchTypes.join(', ')}`;
  }
}