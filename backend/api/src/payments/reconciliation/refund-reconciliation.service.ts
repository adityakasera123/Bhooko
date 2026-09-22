import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RazorpayReconciliationProvider } from './razorpay-reconciliation.provider';
import { ReconciliationMatcher } from './reconciliation-matcher.service';
import { ReconciliationResolutionService } from './reconciliation-resolution.service';

@Injectable()
export class RefundReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RazorpayReconciliationProvider,
    private readonly matcher: ReconciliationMatcher,
    private readonly resolutionService: ReconciliationResolutionService,
  ) {}

  async reconcileRefund(
    reconciliationRunId: string,
    refundId: string,
  ) {
    const refund = await this.prisma.refund.findUnique({
      where: {
        id: refundId,
      },
    });

    if (!refund) {
      throw new Error(
        `Refund ${refundId} not found`,
      );
    }

    if (!refund.razorpayRefundId) {
      return this.createMissingExternalReferenceRecord(
        reconciliationRunId,
        refund,
      );
    }

    try {
      const external =
        await this.provider.fetchRefund(
          refund.razorpayRefundId,
        );

      const result =
        this.matcher.matchRefund(
          {
            id: refund.id,
            razorpayRefundId:
              refund.razorpayRefundId,
            razorpayPaymentId:
              refund.paymentTransactionId,
            amountInPaise:
              refund.amountInPaise,
            currency: 'INR',
            status: refund.status,
          },
          external,
        );

      return await this.resolutionService.resolveRefund(
        reconciliationRunId,
        refund.id,
        result,
      );
    } catch (error) {
      return this.createErrorRecord(
        reconciliationRunId,
        refund,
        error,
      );
    }
  }

  private async createMissingExternalReferenceRecord(
    reconciliationRunId: string,
    refund: {
      id: string;
      paymentTransactionId: string;
      razorpayRefundId: string | null;
      amountInPaise: number;
      status: string;
    },
  ) {
    return this.prisma.reconciliationRecord.create({
      data: {
        reconciliationRunId,
        refundId: refund.id,
        entityType: 'REFUND',
        entityExternalId: refund.id,
        mismatchType:
          'MISSING_EXTERNAL_REFERENCE',
        localState: refund.status,
        externalState: null,
        localAmountInPaise:
          refund.amountInPaise,
        externalAmountInPaise: null,
        localCurrency: 'INR',
        externalCurrency: null,
        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',
        resolutionReason:
          'Refund does not have a Razorpay refund ID',
      },
    });
  }

  private async createErrorRecord(
    reconciliationRunId: string,
    refund: {
      id: string;
      paymentTransactionId: string;
      razorpayRefundId: string | null;
      amountInPaise: number;
      status: string;
    },
    error: unknown,
  ) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown reconciliation error';

    return this.prisma.reconciliationRecord.create({
      data: {
        reconciliationRunId,
        refundId: refund.id,
        entityType: 'REFUND',
        entityExternalId:
          refund.razorpayRefundId ??
          refund.id,
        mismatchType: 'UNKNOWN',
        localState: refund.status,
        externalState: null,
        localAmountInPaise:
          refund.amountInPaise,
        externalAmountInPaise: null,
        localCurrency: 'INR',
        externalCurrency: null,
        action: 'NONE',
        resolutionStatus: 'ERROR',
        errorCode: 'RECONCILIATION_ERROR',
        errorMessage,
      },
    });
  }
}