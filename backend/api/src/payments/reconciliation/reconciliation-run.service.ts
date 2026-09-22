import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ReconciliationResolutionService } from './reconciliation-resolution.service';
import { ReconciliationMatcher } from './reconciliation-matcher.service';
import { RazorpayReconciliationProvider } from './razorpay-reconciliation.provider';
import { RefundReconciliationService } from './refund-reconciliation.service';

@Injectable()
export class ReconciliationRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly provider: RazorpayReconciliationProvider,
    private readonly matcher: ReconciliationMatcher,
    private readonly resolutionService: ReconciliationResolutionService,
    private readonly refundReconciliationService: RefundReconciliationService,
  ) {}

  async startRun(
    mode: 'SCHEDULED' | 'TARGETED',
    windowStart?: Date,
    windowEnd?: Date,
  ) {
    return this.prisma.reconciliationRun.create({
      data: {
        mode,
        status: 'RUNNING',
        windowStart,
        windowEnd,
      },
    });
  }

  async run(
    mode: 'SCHEDULED' | 'TARGETED',
    windowStart?: Date,
    windowEnd?: Date,
  ) {
    const run = await this.startRun(
      mode,
      windowStart,
      windowEnd,
    );

    try {
      // ============================================================
      // LOCAL PAYMENT RECONCILIATION
      // ============================================================

      const payments = await this.getLocalPayments(
        windowStart,
        windowEnd,
      );

      for (const payment of payments) {
        await this.reconcilePayment(
          run.id,
          payment,
        );
      }

      // ============================================================
      // EXTERNAL PAYMENT RECONCILIATION
      // ============================================================

      await this.reconcileExternalPayments(
        run.id,
        windowStart,
        windowEnd,
      );

      // ============================================================
      // LOCAL REFUND RECONCILIATION
      // ============================================================

      const refunds = await this.getLocalRefunds(
        windowStart,
        windowEnd,
      );

      for (const refund of refunds) {
        await this.refundReconciliationService.reconcileRefund(
          run.id,
          refund.id,
        );
      }

      // ============================================================
      // FINALIZE RUN
      // ============================================================

      await this.finalizeRun(run.id);

      return this.getRun(run.id);
    } catch (error) {
      await this.markRunFailed(
        run.id,
        error,
      );

      throw error;
    }
  }

  // ============================================================
  // LOCAL PAYMENT DISCOVERY
  // ============================================================

  private async getLocalPayments(
    windowStart?: Date,
    windowEnd?: Date,
  ) {
    return this.prisma.paymentTransaction.findMany({
      where: {
        ...(windowStart || windowEnd
          ? {
              createdAt: {
                ...(windowStart
                  ? { gte: windowStart }
                  : {}),
                ...(windowEnd
                  ? { lte: windowEnd }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // ============================================================
  // LOCAL REFUND DISCOVERY
  // ============================================================

  private async getLocalRefunds(
    windowStart?: Date,
    windowEnd?: Date,
  ) {
    return this.prisma.refund.findMany({
      where: {
        ...(windowStart || windowEnd
          ? {
              createdAt: {
                ...(windowStart
                  ? { gte: windowStart }
                  : {}),
                ...(windowEnd
                  ? { lte: windowEnd }
                  : {}),
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // ============================================================
  // LOCAL PAYMENT RECONCILIATION
  // ============================================================

  private async reconcilePayment(
    reconciliationRunId: string,
    payment: {
      id: string;
      razorpayPaymentId: string | null;
      razorpayOrderId: string | null;
      amountInPaise: number;
      currency: string;
      status: string;
    },
  ) {
    // ------------------------------------------------------------
    // Missing external payment reference
    // ------------------------------------------------------------

    if (!payment.razorpayPaymentId) {
      await this.createMissingExternalReferenceRecord(
        reconciliationRunId,
        payment,
      );

      return;
    }

    // ------------------------------------------------------------
    // Fetch external payment
    // ------------------------------------------------------------

    try {
      const external =
        await this.provider.fetchPayment(
          payment.razorpayPaymentId,
        );

      const result =
        this.matcher.matchPayment(
          {
            id: payment.id,
            razorpayPaymentId:
              payment.razorpayPaymentId,
            razorpayOrderId:
              payment.razorpayOrderId,
            amountInPaise:
              payment.amountInPaise,
            currency: payment.currency,
            status: payment.status,
          },
          external,
        );

      await this.resolutionService.resolvePayment(
        reconciliationRunId,
        payment.id,
        result,
      );
    } catch (error) {
      await this.createErrorRecord(
        reconciliationRunId,
        payment,
        error,
      );
    }
  }

  // ============================================================
  // EXTERNAL PAYMENT RECONCILIATION
  // ============================================================

  private async reconcileExternalPayments(
    reconciliationRunId: string,
    windowStart?: Date,
    windowEnd?: Date,
  ) {
    try {
      const externalPayments =
        await this.provider.fetchPayments({
          ...(windowStart
            ? {
                from: Math.floor(
                  windowStart.getTime() / 1000,
                ),
              }
            : {}),
          ...(windowEnd
            ? {
                to: Math.floor(
                  windowEnd.getTime() / 1000,
                ),
              }
            : {}),
        });

      for (const externalPayment of externalPayments) {
        const localPayment =
          await this.prisma.paymentTransaction.findFirst({
            where: {
              razorpayPaymentId:
                externalPayment.id,
            },
          });

        if (localPayment) {
          continue;
        }

        await this.createLocalRecordMissingRecord(
          reconciliationRunId,
          externalPayment,
        );
      }
    } catch (error) {
      await this.createExternalPaymentDiscoveryErrorRecord(
        reconciliationRunId,
        error,
      );
    }
  }

  // ============================================================
  // EXTERNAL PAYMENT WITHOUT LOCAL RECORD
  // ============================================================

  private async createLocalRecordMissingRecord(
    reconciliationRunId: string,
    externalPayment: {
      id: string;
      orderId: string | null;
      amountInPaise: number;
      currency: string;
      status: string;
      createdAt: Date | null;
    },
  ) {
    await this.prisma.reconciliationRecord.create({
      data: {
        reconciliationRunId,

        entityType: 'PAYMENT',
        entityExternalId:
          externalPayment.id,

        mismatchType: 'LOCAL_RECORD_MISSING',

        localState: null,
        externalState:
          externalPayment.status,

        localAmountInPaise: null,
        externalAmountInPaise:
          externalPayment.amountInPaise,

        localCurrency: null,
        externalCurrency:
          externalPayment.currency,

        action: 'FLAG_REVIEW',
        resolutionStatus: 'REVIEW_REQUIRED',

        resolutionReason:
          'Razorpay payment exists without a corresponding local payment transaction.',

        errorCode:
          'LOCAL_RECORD_MISSING',

        errorMessage:
          'No local PaymentTransaction was found for the external Razorpay payment.',
      },
    });
  }

  // ============================================================
  // EXTERNAL PAYMENT DISCOVERY ERROR
  // ============================================================

  private async createExternalPaymentDiscoveryErrorRecord(
    reconciliationRunId: string,
    error: unknown,
  ) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown external payment discovery error';

    await this.prisma.reconciliationRecord.create({
      data: {
        reconciliationRunId,

        entityType: 'PAYMENT',
        entityExternalId:
          `EXTERNAL_DISCOVERY_${Date.now()}`,

        mismatchType: 'UNKNOWN',

        localState: null,
        externalState: null,

        localAmountInPaise: null,
        externalAmountInPaise: null,

        localCurrency: null,
        externalCurrency: null,

        action: 'NONE',
        resolutionStatus: 'ERROR',

        errorCode:
          'EXTERNAL_PAYMENT_DISCOVERY_ERROR',

        errorMessage,
      },
    });
  }

  // ============================================================
  // MISSING EXTERNAL PAYMENT REFERENCE
  // ============================================================

  private async createMissingExternalReferenceRecord(
    reconciliationRunId: string,
    payment: {
      id: string;
      razorpayPaymentId: string | null;
      amountInPaise: number;
      currency: string;
      status: string;
    },
  ) {
    await this.prisma.reconciliationRecord.create({
      data: {
        reconciliationRunId,

        paymentTransactionId:
          payment.id,

        entityType: 'PAYMENT',

        entityExternalId:
          payment.id,

        mismatchType:
          'MISSING_EXTERNAL_REFERENCE',

        localState:
          payment.status,

        externalState:
          null,

        localAmountInPaise:
          payment.amountInPaise,

        externalAmountInPaise:
          null,

        localCurrency:
          payment.currency,

        externalCurrency:
          null,

        action:
          'FLAG_REVIEW',

        resolutionStatus:
          'REVIEW_REQUIRED',

        resolutionReason:
          'Local payment transaction is missing its Razorpay payment reference.',

        errorCode:
          'MISSING_EXTERNAL_REFERENCE',

        errorMessage:
          'PaymentTransaction does not contain a Razorpay payment ID.',

        resolvedAt:
          null,
      },
    });
  }

  // ============================================================
  // PAYMENT ERROR RECORD
  // ============================================================

  private async createErrorRecord(
    reconciliationRunId: string,
    payment: {
      id: string;
      razorpayPaymentId: string | null;
      amountInPaise: number;
      currency: string;
      status: string;
    },
    error: unknown,
  ) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown reconciliation error';

    await this.prisma.reconciliationRecord.create({
      data: {
        reconciliationRunId,

        paymentTransactionId:
          payment.id,

        entityType:
          'PAYMENT',

        entityExternalId:
          payment.razorpayPaymentId ??
          payment.id,

        mismatchType:
          'UNKNOWN',

        localState:
          payment.status,

        externalState:
          null,

        localAmountInPaise:
          payment.amountInPaise,

        externalAmountInPaise:
          null,

        localCurrency:
          payment.currency,

        externalCurrency:
          null,

        action:
          'NONE',

        resolutionStatus:
          'ERROR',

        errorCode:
          'RECONCILIATION_ERROR',

        errorMessage,
      },
    });
  }

  // ============================================================
  // FINALIZE RUN
  // ============================================================

  private async finalizeRun(
    reconciliationRunId: string,
  ) {
    const records =
      await this.prisma.reconciliationRecord.findMany({
        where: {
          reconciliationRunId,
        },
        select: {
          resolutionStatus: true,
        },
      });

    const matchedCount =
      records.filter(
        (record) =>
          record.resolutionStatus ===
          'MATCHED',
      ).length;

    const mismatchCount =
      records.filter(
        (record) =>
          record.resolutionStatus !==
          'MATCHED',
      ).length;

    const autoResolvedCount =
      records.filter(
        (record) =>
          record.resolutionStatus ===
          'AUTO_RESOLVED',
      ).length;

    const reviewRequiredCount =
      records.filter(
        (record) =>
          record.resolutionStatus ===
          'REVIEW_REQUIRED',
      ).length;

    const errorCount =
      records.filter(
        (record) =>
          record.resolutionStatus ===
          'ERROR',
      ).length;

    return this.prisma.reconciliationRun.update({
      where: {
        id: reconciliationRunId,
      },

      data: {
        status:
          'COMPLETED',

        completedAt:
          new Date(),

        totalChecked:
          records.length,

        matchedCount,

        mismatchCount,

        autoResolvedCount,

        reviewRequiredCount,

        errorCount,
      },
    });
  }

  // ============================================================
  // MARK RUN FAILED
  // ============================================================

  private async markRunFailed(
    reconciliationRunId: string,
    error: unknown,
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown reconciliation run error';

    await this.prisma.reconciliationRun.update({
      where: {
        id: reconciliationRunId,
      },

      data: {
        status:
          'FAILED',

        completedAt:
          new Date(),
      },
    });

    throw new InternalServerErrorException(
      `Reconciliation run failed: ${message}`,
    );
  }

  // ============================================================
  // GET RUN
  // ============================================================

  private async getRun(
    reconciliationRunId: string,
  ) {
    return this.prisma.reconciliationRun.findUnique({
      where: {
        id: reconciliationRunId,
      },

      include: {
        records: true,
      },
    });
  }
}