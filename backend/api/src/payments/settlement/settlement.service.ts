import { Injectable, NotFoundException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SettlementCalculatorService,
  SettlementCalculationResult,
} from './settlement-calculator.service';
import { SettlementEligibilityService } from './settlement-eligibility.service';
import { SettlementReconciliationService } from './settlement-reconciliation.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';

export interface CreateSettlementInput {
  orderId: string;
  adjustmentWindowComplete: boolean;
  hasBlockingIssue?: boolean;
  adjustmentAmountInPaise?: number;
}

@Injectable()
export class SettlementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculator: SettlementCalculatorService,
    private readonly eligibility: SettlementEligibilityService,
    private readonly stateMachine: SettlementStateMachineService,
    private readonly reconciliation: SettlementReconciliationService,
  ) {}

  async createSettlement(
    input: CreateSettlementInput,
  ): Promise<{
    settlementId: string;
    status: SettlementStatus;
    calculation: SettlementCalculationResult;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: {
          id: input.orderId,
        },
        include: {
          paymentTransaction: {
            include: {
              refunds: {
                where: {
                  status: 'PROCESSED',
                },
              },
            },
          },
          settlement: true,
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Idempotency:
      // If settlement already exists for this order,
      // return the existing settlement instead of creating
      // a duplicate record.
      if (order.settlement) {
        const existing = order.settlement;

        const calculation: SettlementCalculationResult = {
          grossAmountInPaise: existing.grossAmountInPaise,
          refundAmountInPaise: existing.refundAmountInPaise,
          adjustmentAmountInPaise: existing.adjustmentAmountInPaise,
          platformFeeInPaise: existing.platformFeeInPaise,
          restaurantPayableInPaise:
            existing.restaurantPayableInPaise,
        };

        return {
          settlementId: existing.id,
          status: existing.status,
          calculation,
        };
      }

      if (!order.paymentTransaction) {
        throw new Error(
          'Order has no payment transaction',
        );
      }

      const payment = order.paymentTransaction;

      const refundAmountInPaise = payment.refunds.reduce(
        (total, refund) =>
          total + refund.amountInPaise,
        0,
      );

      const adjustmentAmountInPaise =
        input.adjustmentAmountInPaise ?? 0;

      const isEligible =
        this.eligibility.isEligible({
          orderStatus: order.status,
          paymentStatus: payment.status,
          adjustmentWindowComplete:
            input.adjustmentWindowComplete,
          hasBlockingIssue: input.hasBlockingIssue,
        });

      const calculation =
        this.calculator.calculate({
          grossAmountInPaise: order.totalInPaise,
          refundAmountInPaise,
          adjustmentAmountInPaise,
          platformFeeInPaise:
            order.platformFeeInPaise,
        });

      /*
       * Every newly-created settlement starts from
       * PENDING and may transition to ELIGIBLE only
       * when eligibility conditions are satisfied.
       */
      const targetStatus = isEligible
        ? SettlementStatus.ELIGIBLE
        : SettlementStatus.PENDING;

      const status =
        this.stateMachine.transition(
          SettlementStatus.PENDING,
          targetStatus,
        );

      const settlement =
        await tx.settlement.create({
          data: {
            orderId: order.id,
            restaurantId: order.restaurantId,
            paymentTransactionId: payment.id,

            grossAmountInPaise:
              calculation.grossAmountInPaise,

            refundAmountInPaise:
              calculation.refundAmountInPaise,

            adjustmentAmountInPaise:
              calculation.adjustmentAmountInPaise,

            platformFeeInPaise:
              calculation.platformFeeInPaise,

            restaurantPayableInPaise:
              calculation.restaurantPayableInPaise,

            status,

            eligibleAt:
              status === SettlementStatus.ELIGIBLE
                ? new Date()
                : null,
          },
        });

      return {
        settlementId: settlement.id,
        status: settlement.status,
        calculation,
      };
    });
  }

  /**
   * Reconcile a settlement's recorded restaurant payable
   * against the expected payable amount.
   *
   * This is a read-only reconciliation operation.
   * It does not modify the settlement record.
   */
  async reconcileSettlement(
    settlementId: string,
    expectedRestaurantPayableInPaise: number,
  ) {
    const settlement =
      await this.prisma.settlement.findUnique({
        where: {
          id: settlementId,
        },
      });

    if (!settlement) {
      throw new NotFoundException(
        'Settlement not found',
      );
    }

    return this.reconciliation.reconcile({
      expectedRestaurantPayableInPaise,
      recordedRestaurantPayableInPaise:
        settlement.restaurantPayableInPaise,
    });
  }
}