import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ReconciliationResolver } from './reconciliation-resolver.service';
import { ReconciliationMatchResult } from './types/reconciliation-match-result.type';

@Injectable()
export class ReconciliationResolutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: ReconciliationResolver,
  ) {}

  async resolvePayment(
    reconciliationRunId: string,
    paymentTransactionId: string,
    result: ReconciliationMatchResult,
  ) {
    const resolution = this.resolver.resolve(result);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentTransaction.findUnique({
        where: {
          id: paymentTransactionId,
        },
      });

      if (!payment) {
        throw new InternalServerErrorException(
          `Payment transaction ${paymentTransactionId} not found`,
        );
      }

      const existingRecord =
        await tx.reconciliationRecord.findUnique({
          where: {
            reconciliationRunId_entityType_entityExternalId: {
              reconciliationRunId,
              entityType: 'PAYMENT',
              entityExternalId: paymentTransactionId,
            },
          },
        });

      if (existingRecord) {
        return existingRecord;
      }

      const oldLocalState = payment.status;

      let newLocalState = oldLocalState;

      if (
        resolution.action === 'AUTO_RESOLVE' &&
        resolution.newLocalState
      ) {
        newLocalState = resolution.newLocalState as
          | 'CREATED'
          | 'PENDING'
          | 'PAID'
          | 'FAILED'
          | 'REFUND_PENDING'
          | 'REFUNDED';

        if (newLocalState !== oldLocalState) {
          await tx.paymentTransaction.update({
            where: {
              id: paymentTransactionId,
            },
            data: {
              status: newLocalState,
            },
          });
        }
      }

      const record =
        await tx.reconciliationRecord.create({
          data: {
            reconciliationRunId,
            paymentTransactionId,
            entityType: 'PAYMENT',
            entityExternalId:
              payment.razorpayPaymentId ??
              paymentTransactionId,
            mismatchType: result.mismatchType,
            localState: oldLocalState,
            externalState: result.externalState,
            localAmountInPaise:
              result.verification.amountMatched
                ? payment.amountInPaise
                : payment.amountInPaise,
            externalAmountInPaise:
              result.verification.amountMatched
                ? payment.amountInPaise
                : null,
            localCurrency: payment.currency,
            externalCurrency:
              result.verification.currencyMatched
                ? payment.currency
                : null,
            action:
              resolution.action === 'AUTO_RESOLVE'
                ? 'AUTO_RESOLVE'
                : resolution.action === 'FLAG_REVIEW'
                  ? 'FLAG_REVIEW'
                  : 'NONE',
            resolutionStatus:
              resolution.resolutionStatus ===
              'AUTO_RESOLVED'
                ? 'AUTO_RESOLVED'
                : resolution.resolutionStatus ===
                    'REVIEW_REQUIRED'
                  ? 'REVIEW_REQUIRED'
                  : 'MATCHED',
            oldLocalState,
            newLocalState,
            resolutionRule:
              resolution.resolutionRule,
            resolutionReason:
              resolution.resolutionReason,
            resolvedAt:
              resolution.action === 'AUTO_RESOLVE'
                ? new Date()
                : null,
          },
        });

      return record;
    });
  }

  async resolveRefund(
    reconciliationRunId: string,
    refundId: string,
    result: ReconciliationMatchResult,
  ) {
    const resolution = this.resolver.resolve(result);

    return this.prisma.$transaction(async (tx) => {
      const refund = await tx.refund.findUnique({
        where: {
          id: refundId,
        },
      });

      if (!refund) {
        throw new InternalServerErrorException(
          `Refund ${refundId} not found`,
        );
      }

      const existingRecord =
        await tx.reconciliationRecord.findUnique({
          where: {
            reconciliationRunId_entityType_entityExternalId: {
              reconciliationRunId,
              entityType: 'REFUND',
              entityExternalId:
                refund.razorpayRefundId ?? refundId,
            },
          },
        });

      if (existingRecord) {
        return existingRecord;
      }

      const oldLocalState = refund.status;

      let newLocalState = oldLocalState;

      if (
        resolution.action === 'AUTO_RESOLVE' &&
        resolution.newLocalState
      ) {
        newLocalState = resolution.newLocalState as
          | 'PENDING'
          | 'PROCESSED'
          | 'FAILED';

        if (newLocalState !== oldLocalState) {
          await tx.refund.update({
            where: {
              id: refundId,
            },
            data: {
              status: newLocalState,
            },
          });
        }
      }

      const record =
        await tx.reconciliationRecord.create({
          data: {
            reconciliationRunId,
            refundId,
            entityType: 'REFUND',
            entityExternalId:
              refund.razorpayRefundId ?? refundId,
            mismatchType: result.mismatchType,
            localState: oldLocalState,
            externalState: result.externalState,
            localAmountInPaise:
              refund.amountInPaise,
            externalAmountInPaise:
              result.verification.amountMatched
                ? refund.amountInPaise
                : null,
            localCurrency: 'INR',
            externalCurrency:
              result.verification.currencyMatched
                ? 'INR'
                : null,
            action:
              resolution.action === 'AUTO_RESOLVE'
                ? 'AUTO_RESOLVE'
                : resolution.action === 'FLAG_REVIEW'
                  ? 'FLAG_REVIEW'
                  : 'NONE',
            resolutionStatus:
              resolution.resolutionStatus ===
              'AUTO_RESOLVED'
                ? 'AUTO_RESOLVED'
                : resolution.resolutionStatus ===
                    'REVIEW_REQUIRED'
                  ? 'REVIEW_REQUIRED'
                  : 'MATCHED',
            oldLocalState,
            newLocalState,
            resolutionRule:
              resolution.resolutionRule,
            resolutionReason:
              resolution.resolutionReason,
            resolvedAt:
              resolution.action === 'AUTO_RESOLVE'
                ? new Date()
                : null,
          },
        });

      return record;
    });
  }
}