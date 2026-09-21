import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}


async requestRefund(
  userId: string,
  paymentTransactionId: string,
  dto: RefundPaymentDto,
) {
  const paymentTransaction =
    await this.prisma.paymentTransaction.findFirst({
      where: {
        id: paymentTransactionId,
        customerId: userId,
      },
      include: {
        orders: true,
      },
    });

  if (!paymentTransaction) {
    throw new NotFoundException(
      'Payment transaction not found or does not belong to you',
    );
  }

  const existingRefund =
    await this.prisma.refund.findUnique({
      where: {
        paymentTransactionId_idempotencyKey: {
          paymentTransactionId,
          idempotencyKey: dto.idempotencyKey,
        },
      },
    });

  if (existingRefund) {
    if (
      existingRefund.amountInPaise !==
      dto.amountInPaise
    ) {
      throw new ConflictException(
        'Idempotency key was already used for a different refund amount',
      );
    }

    return {
      message:
        existingRefund.status === 'PROCESSED'
          ? 'Refund has already been completed'
          : existingRefund.status === 'FAILED'
            ? 'Refund failed'
            : 'Refund is already pending',
      paymentTransactionId,
      refundId: existingRefund.razorpayRefundId,
      refundedAmountInPaise:
        existingRefund.amountInPaise,
      status:
        existingRefund.status === 'PROCESSED'
          ? 'REFUNDED'
          : existingRefund.status === 'FAILED'
            ? 'PAID'
            : 'REFUND_PENDING',
      orderIds: paymentTransaction.orders.map(
        (order) => order.id,
      ),
    };
  }

  if (paymentTransaction.status === 'REFUND_PENDING') {
    return {
      message: 'Refund is already pending',
      paymentTransactionId: paymentTransaction.id,
      refundId: paymentTransaction.refundId,
      refundedAmountInPaise:
        paymentTransaction.refundedAmountInPaise,
      status: paymentTransaction.status,
      orderIds: paymentTransaction.orders.map(
        (order) => order.id,
      ),
    };
  }

  if (paymentTransaction.status === 'REFUNDED') {
    return {
      message: 'Refund has already been completed',
      paymentTransactionId: paymentTransaction.id,
      refundId: paymentTransaction.refundId,
      refundedAmountInPaise:
        paymentTransaction.refundedAmountInPaise,
      status: paymentTransaction.status,
      orderIds: paymentTransaction.orders.map(
        (order) => order.id,
      ),
    };
  }

  if (paymentTransaction.status !== 'PAID') {
    throw new BadRequestException(
      `Payment transaction cannot be refunded from status ${paymentTransaction.status}`,
    );
  }

  if (!paymentTransaction.razorpayPaymentId) {
    throw new BadRequestException(
      'Payment transaction is not linked to a Razorpay payment',
    );
  }

  if (
    !Number.isInteger(dto.amountInPaise) ||
    dto.amountInPaise <= 0
  ) {
    throw new BadRequestException(
      'Refund amount must be greater than zero',
    );
  }

  /*
   * Reserve the refund before calling Razorpay.
   *
   * This prevents two concurrent refund requests from both
   * seeing the same refundable balance and sending duplicate
   * refunds to Razorpay.
   */
  let refundReservation: {
    id: string;
    paymentTransactionId: string;
    razorpayRefundId: string | null;
    amountInPaise: number;
    status: 'PENDING' | 'PROCESSED' | 'FAILED';
    reason: string | null;
    idempotencyKey: string;
  };

  try {
    refundReservation =
      await this.prisma.$transaction(async (tx) => {
        /*
         * Re-read the payment transaction inside the transaction.
         * This is important because the first read happened before
         * the database transaction started.
         */
        const lockedPayment =
          await tx.paymentTransaction.findUnique({
            where: {
              id: paymentTransaction.id,
            },
          });

        if (!lockedPayment) {
          throw new NotFoundException(
            'Payment transaction not found',
          );
        }

        /*
         * Another request may have changed the payment status
         * after the first read.
         */
        if (lockedPayment.status !== 'PAID') {
          throw new ConflictException(
            `Payment transaction is no longer refundable from status ${lockedPayment.status}`,
          );
        }

        /*
         * Re-check idempotency inside the transaction so that
         * concurrent requests using the same key are safe.
         */
        const existingReservation =
          await tx.refund.findUnique({
            where: {
              paymentTransactionId_idempotencyKey: {
                paymentTransactionId:
                  lockedPayment.id,
                idempotencyKey: dto.idempotencyKey,
              },
            },
          });

        if (existingReservation) {
          if (
            existingReservation.amountInPaise !==
            dto.amountInPaise
          ) {
            throw new ConflictException(
              'Idempotency key was already used for a different refund amount',
            );
          }

          return existingReservation;
        }

        /*
         * Lock the payment transaction row so concurrent refund
         * requests for the same payment are serialized.
         */
        await tx.$queryRaw`
          SELECT id
          FROM "PaymentTransaction"
          WHERE id = ${lockedPayment.id}
          FOR UPDATE
        `;

        /*
         * Re-check the status after acquiring the row lock.
         */
        const lockedPaymentAfterLock =
          await tx.paymentTransaction.findUnique({
            where: {
              id: lockedPayment.id,
            },
          });

        if (!lockedPaymentAfterLock) {
          throw new NotFoundException(
            'Payment transaction not found',
          );
        }

        if (
          lockedPaymentAfterLock.status !== 'PAID'
        ) {
          throw new ConflictException(
            `Payment transaction is no longer refundable from status ${lockedPaymentAfterLock.status}`,
          );
        }

        /*
         * Calculate successfully processed refunds while the
         * payment transaction row is locked.
         */
        const refundAggregate =
          await tx.refund.aggregate({
            where: {
              paymentTransactionId:
                lockedPaymentAfterLock.id,
              status: 'PROCESSED',
            },
            _sum: {
              amountInPaise: true,
            },
          });

        const refundedSoFarInPaise =
          refundAggregate._sum.amountInPaise ?? 0;

        /*
         * Also account for already pending reservations.
         * Those amounts are already committed to another
         * refund request and cannot be spent again.
         */
        const pendingRefundAggregate =
          await tx.refund.aggregate({
            where: {
              paymentTransactionId:
                lockedPaymentAfterLock.id,
              status: 'PENDING',
            },
            _sum: {
              amountInPaise: true,
            },
          });

        const pendingRefundAmountInPaise =
          pendingRefundAggregate._sum.amountInPaise ?? 0;

        const remainingRefundableInPaise =
          lockedPaymentAfterLock.amountInPaise -
          refundedSoFarInPaise -
          pendingRefundAmountInPaise;

        if (
          dto.amountInPaise >
          remainingRefundableInPaise
        ) {
          throw new BadRequestException(
            `Refund amount cannot exceed the remaining refundable amount of ${remainingRefundableInPaise} paise`,
          );
        }

        /*
         * Reserve the refund BEFORE Razorpay is called.
         */
        const createdRefund =
          await tx.refund.create({
            data: {
              paymentTransactionId:
                lockedPaymentAfterLock.id,
              razorpayRefundId: null,
              amountInPaise:
                dto.amountInPaise,
              status: 'PENDING',
              reason: dto.reason,
              idempotencyKey:
                dto.idempotencyKey,
            },
          });

        /*
         * Mark the payment as refund-pending immediately.
         * Razorpay is called only after this transaction commits.
         */
        await tx.paymentTransaction.update({
          where: {
            id: lockedPaymentAfterLock.id,
          },
          data: {
            status: 'REFUND_PENDING',
            refundId: null,
            refundReason: dto.reason,
            refundedAmountInPaise:
              refundedSoFarInPaise,
          },
        });

        return createdRefund;
      });
  } catch (error) {
    /*
     * If another concurrent request already used the same
     * idempotency key, return that request's refund.
     */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const existingRefund =
        await this.prisma.refund.findUnique({
          where: {
            paymentTransactionId_idempotencyKey: {
              paymentTransactionId,
              idempotencyKey: dto.idempotencyKey,
            },
          },
        });

      if (existingRefund) {
        if (
          existingRefund.amountInPaise !==
          dto.amountInPaise
        ) {
          throw new ConflictException(
            'Idempotency key was already used for a different refund amount',
          );
        }

        return {
          message:
            existingRefund.status === 'PROCESSED'
              ? 'Refund has already been completed'
              : existingRefund.status === 'FAILED'
                ? 'Refund failed'
                : 'Refund is already pending',
          paymentTransactionId,
          refundId:
            existingRefund.razorpayRefundId,
          refundedAmountInPaise:
            existingRefund.amountInPaise,
          status:
            existingRefund.status === 'PROCESSED'
              ? 'REFUNDED'
              : existingRefund.status === 'FAILED'
                ? 'PAID'
                : 'REFUND_PENDING',
          orderIds:
            paymentTransaction.orders.map(
              (order) => order.id,
            ),
        };
      }
    }

    throw error;
  }

  /*
   * Razorpay is intentionally called AFTER the DB reservation
   * has committed.
   */
  let razorpayRefund;

  try {
    razorpayRefund =
      await this.razorpayService.createRefund(
        paymentTransaction.razorpayPaymentId,
        dto.amountInPaise,
        paymentTransaction.id,
      );
  } catch (error) {
    /*
     * We cannot safely assume the Razorpay request was never
     * received. Keep the refund PENDING so webhook/recovery
     * can resolve it without risking a duplicate refund.
     */
    throw error;
  }

  if (razorpayRefund.amount !== dto.amountInPaise) {
    throw new BadRequestException(
      'Razorpay refund amount does not match the requested refund amount',
    );
  }

  if (
    razorpayRefund.payment_id &&
    razorpayRefund.payment_id !==
      paymentTransaction.razorpayPaymentId
  ) {
    throw new BadRequestException(
      'Razorpay refund does not belong to the payment transaction',
    );
  }

  const refundStatus =
    typeof razorpayRefund.status === 'string'
      ? razorpayRefund.status
      : 'pending';

  let internalRefundStatus:
    | 'PENDING'
    | 'PROCESSED'
    | 'FAILED';

  if (refundStatus === 'processed') {
    internalRefundStatus = 'PROCESSED';
  } else if (refundStatus === 'failed') {
    internalRefundStatus = 'FAILED';
  } else {
    internalRefundStatus = 'PENDING';
  }

  const updatedRefund =
    await this.prisma.$transaction(async (tx) => {
      const currentRefund =
        await tx.refund.findUnique({
          where: {
            id: refundReservation.id,
          },
        });

      if (!currentRefund) {
        throw new NotFoundException(
          'Refund reservation not found',
        );
      }

      /*
       * Another process/webhook may already have finalized
       * this refund. Never overwrite a final state.
       */
      if (
        currentRefund.status === 'PROCESSED' ||
        currentRefund.status === 'FAILED'
      ) {
        return currentRefund;
      }

      const updated =
        await tx.refund.update({
          where: {
            id: currentRefund.id,
          },
          data: {
            razorpayRefundId:
              razorpayRefund.id,
            status: internalRefundStatus,
          },
        });

      /*
       * For a processed refund, calculate the cumulative
       * successful refund amount from the database.
       */
      const processedAggregate =
        await tx.refund.aggregate({
          where: {
            paymentTransactionId:
              paymentTransaction.id,
            status: 'PROCESSED',
          },
          _sum: {
            amountInPaise: true,
          },
        });

      const cumulativeRefundedInPaise =
        processedAggregate._sum.amountInPaise ?? 0;

      const pendingCount =
        await tx.refund.count({
          where: {
            paymentTransactionId:
              paymentTransaction.id,
            status: 'PENDING',
          },
        });

      let nextPaymentStatus:
        | 'PAID'
        | 'REFUND_PENDING'
        | 'REFUNDED';

      if (
        cumulativeRefundedInPaise >=
        paymentTransaction.amountInPaise
      ) {
        nextPaymentStatus = 'REFUNDED';
      } else if (pendingCount > 0) {
        nextPaymentStatus = 'REFUND_PENDING';
      } else {
        nextPaymentStatus = 'PAID';
      }

      await tx.paymentTransaction.update({
        where: {
          id: paymentTransaction.id,
        },
        data: {
          status: nextPaymentStatus,
          refundId: razorpayRefund.id,
          refundedAmountInPaise:
            cumulativeRefundedInPaise,
          refundReason: dto.reason,
        },
      });

      return updated;
    });

  const processedAggregate =
    await this.prisma.refund.aggregate({
      where: {
        paymentTransactionId,
        status: 'PROCESSED',
      },
      _sum: {
        amountInPaise: true,
      },
    });

  const cumulativeRefundedInPaise =
    processedAggregate._sum.amountInPaise ?? 0;

  const pendingCount =
    await this.prisma.refund.count({
      where: {
        paymentTransactionId,
        status: 'PENDING',
      },
    });

  const paymentStatus =
    cumulativeRefundedInPaise >=
    paymentTransaction.amountInPaise
      ? 'REFUNDED'
      : pendingCount > 0
        ? 'REFUND_PENDING'
        : 'PAID';

  return {
    message:
      internalRefundStatus === 'PROCESSED'
        ? paymentStatus === 'REFUNDED'
          ? 'Refund completed successfully'
          : 'Partial refund completed successfully'
        : internalRefundStatus === 'FAILED'
          ? 'Refund failed'
          : 'Refund initiated successfully',
    paymentTransactionId,
    refundId:
      updatedRefund.razorpayRefundId,
    refundedAmountInPaise:
      cumulativeRefundedInPaise,
    status: paymentStatus,
    orderIds: paymentTransaction.orders.map(
      (order) => order.id,
    ),
  };
}





  async createPayment(userId: string, orderIds: string[]) {
    const uniqueOrderIds = [...new Set(orderIds)];

    if (uniqueOrderIds.length === 0) {
      throw new BadRequestException('At least one order is required');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const orders = await tx.order.findMany({
        where: {
          id: {
            in: uniqueOrderIds,
          },
          customerId: userId,
        },
        include: {
          paymentTransaction: true,
        },
      });

      if (orders.length !== uniqueOrderIds.length) {
        throw new NotFoundException(
          'One or more orders were not found or do not belong to you',
        );
      }

      const alreadyLinkedOrders = orders.filter(
        (order) => order.paymentTransactionId !== null,
      );

     if (alreadyLinkedOrders.length > 0) {
  const existingPaymentTransactionId =
    alreadyLinkedOrders[0].paymentTransactionId;

  const samePaymentTransaction = orders.every(
    (order) =>
      order.paymentTransactionId === existingPaymentTransactionId,
  );

  if (!samePaymentTransaction || !existingPaymentTransactionId) {
    throw new ConflictException(
      'One or more orders are already linked to different payment transactions',
    );
  }

  const existingPayment =
    alreadyLinkedOrders[0].paymentTransaction;

  if (
    existingPayment &&
    existingPayment.status === 'PENDING' &&
    existingPayment.razorpayOrderId
  ) {
    return {
      type: 'existing' as const,
      paymentTransactionId: existingPayment.id,
      razorpayOrderId: existingPayment.razorpayOrderId,
      amountInPaise: existingPayment.amountInPaise,
      currency: existingPayment.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderIds: uniqueOrderIds,
    };
  }

  if (
    existingPayment &&
    existingPayment.status === 'FAILED'
  ) {
    await tx.order.updateMany({
      where: {
        id: {
          in: uniqueOrderIds,
        },
        customerId: userId,
        paymentTransactionId: existingPayment.id,
      },
      data: {
        paymentTransactionId: null,
      },
    });
  } else {
    throw new ConflictException(
      'One or more orders are already linked to a payment transaction',
    );
  }
}

      const nonPayableOrder = orders.find(
        (order) =>
          order.status === 'CANCELLED' ||
          order.status === 'DELIVERED',
      );

      if (nonPayableOrder) {
        throw new BadRequestException(
          `Order ${nonPayableOrder.id} is not eligible for payment`,
        );
      }

      const amountInPaise = orders.reduce(
        (total, order) => total + order.totalInPaise,
        0,
      );

      if (amountInPaise <= 0) {
        throw new BadRequestException(
          'Payment amount must be greater than zero',
        );
      }

      const paymentTransaction =
        await tx.paymentTransaction.create({
          data: {
            customerId: userId,
            status: 'CREATED',
            amountInPaise,
            currency: 'INR',
          },
        });

      const claimedOrders = await tx.order.updateMany({
        where: {
          id: {
            in: uniqueOrderIds,
          },
          customerId: userId,
          paymentTransactionId: null,
        },
        data: {
          paymentTransactionId: paymentTransaction.id,
        },
      });

      if (claimedOrders.count !== uniqueOrderIds.length) {
        throw new ConflictException(
          'One or more orders were claimed by another payment transaction',
        );
      }

      return {
        type: 'new' as const,
        paymentTransactionId: paymentTransaction.id,
        amountInPaise,
        currency: paymentTransaction.currency,
        orderIds: uniqueOrderIds,
      };
    });

    if (result.type === 'existing') {
      return result;
    }

    try {
      const razorpayOrder = await this.razorpayService.createOrder(
        result.amountInPaise,
        result.paymentTransactionId,
      );

      const updatedPaymentTransaction =
        await this.prisma.paymentTransaction.update({
          where: {
            id: result.paymentTransactionId,
          },
          data: {
            razorpayOrderId: razorpayOrder.id,
            status: 'PENDING',
          },
        });

      return {
        paymentTransactionId: updatedPaymentTransaction.id,
        razorpayOrderId: razorpayOrder.id,
        amountInPaise: updatedPaymentTransaction.amountInPaise,
        currency: updatedPaymentTransaction.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderIds: result.orderIds,
      };
    } catch (error) {
      await this.prisma.paymentTransaction.update({
        where: {
          id: result.paymentTransactionId,
        },
        data: {
          status: 'FAILED',
        },
      });

      throw error;
    }
  }

  async verifyPayment(
    userId: string,
    dto: VerifyPaymentDto,
  ) {
    const paymentTransaction =
      await this.prisma.paymentTransaction.findFirst({
        where: {
          id: dto.paymentTransactionId,
          customerId: userId,
        },
        include: {
          orders: true,
        },
      });

    if (!paymentTransaction) {
      throw new NotFoundException(
        'Payment transaction not found or does not belong to you',
      );
    }

    if (!paymentTransaction.razorpayOrderId) {
      throw new BadRequestException(
        'Payment transaction is not linked to a Razorpay order',
      );
    }

    if (paymentTransaction.razorpayOrderId !== dto.razorpayOrderId) {
      throw new BadRequestException(
        'Razorpay order ID does not match the payment transaction',
      );
    }

    if (paymentTransaction.status === 'PAID') {
      return {
        message: 'Payment already verified',
        paymentTransactionId: paymentTransaction.id,
        status: paymentTransaction.status,
        orderIds: paymentTransaction.orders.map(
          (order) => order.id,
        ),
      };
    }

    if (paymentTransaction.status !== 'PENDING') {
      throw new BadRequestException(
        `Payment transaction cannot be verified from status ${paymentTransaction.status}`,
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      throw new BadRequestException(
        'Razorpay secret is not configured',
      );
    }

    const expectedSignature = createHmac(
      'sha256',
      keySecret,
    )
      .update(
        `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`,
      )
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException(
        'Invalid Razorpay payment signature',
      );
    }

    const updatedPaymentTransaction =
      await this.prisma.$transaction(async (tx) => {
        const updatedPayment =
          await tx.paymentTransaction.update({
            where: {
              id: paymentTransaction.id,
            },
            data: {
              status: 'PAID',
              razorpayPaymentId: dto.razorpayPaymentId,
              razorpaySignature: dto.razorpaySignature,
            },
          });

        await tx.order.updateMany({
          where: {
            paymentTransactionId: paymentTransaction.id,
            status: 'CREATED',
          },
          data: {
            status: 'CONFIRMED',
          },
        });

        return updatedPayment;
      });

    return {
      message: 'Payment verified successfully',
      paymentTransactionId: updatedPaymentTransaction.id,
      razorpayOrderId: updatedPaymentTransaction.razorpayOrderId,
      razorpayPaymentId: updatedPaymentTransaction.razorpayPaymentId,
      status: updatedPaymentTransaction.status,
      orderIds: paymentTransaction.orders.map(
        (order) => order.id,
      ),
    };
  }

   async handleWebhook(body: Record<string, unknown>) {
    const event =
      typeof body.event === 'string' ? body.event : '';

    if (event.startsWith('refund.')) {
      return this.handleRefundWebhook(body);
    }

    const payload =
      body.payload &&
      typeof body.payload === 'object'
        ? (body.payload as Record<string, unknown>)
        : {};

    const paymentPayload =
      payload.payment &&
      typeof payload.payment === 'object'
        ? (payload.payment as Record<string, unknown>)
        : {};

    const paymentEntity =
      paymentPayload.entity &&
      typeof paymentPayload.entity === 'object'
        ? (paymentPayload.entity as Record<string, unknown>)
        : {};

    const razorpayOrderId =
      typeof paymentEntity.order_id === 'string'
        ? paymentEntity.order_id
        : null;

    const razorpayPaymentId =
      typeof paymentEntity.id === 'string'
        ? paymentEntity.id
        : null;

    const amount =
      typeof paymentEntity.amount === 'number'
        ? paymentEntity.amount
        : null;

    if (!razorpayOrderId) {
      return {
        received: true,
        processed: false,
        reason: 'Razorpay order ID not found in webhook payload',
      };
    }

    const paymentTransaction =
      await this.prisma.paymentTransaction.findUnique({
        where: {
          razorpayOrderId,
        },
      });

    if (!paymentTransaction) {
      return {
        received: true,
        processed: false,
        reason: 'Payment transaction not found',
      };
    }

    if (
      amount !== null &&
      amount !== paymentTransaction.amountInPaise
    ) {
      throw new BadRequestException(
        'Webhook payment amount does not match the payment transaction',
      );
    }

    if (event === 'payment.captured') {
      if (paymentTransaction.status === 'PAID') {
        return {
          received: true,
          processed: false,
          reason: 'Payment already marked as PAID',
          paymentTransactionId: paymentTransaction.id,
        };
      }

      if (
        paymentTransaction.status === 'REFUNDED' ||
        paymentTransaction.status === 'REFUND_PENDING'
      ) {
        return {
          received: true,
          processed: false,
          reason: `Payment transaction is already in ${paymentTransaction.status} state`,
          paymentTransactionId: paymentTransaction.id,
        };
      }

      const updatedPayment =
        await this.prisma.$transaction(async (tx) => {
          const updated =
            await tx.paymentTransaction.update({
              where: {
                id: paymentTransaction.id,
              },
              data: {
                status: 'PAID',
                razorpayPaymentId:
                  razorpayPaymentId ??
                  paymentTransaction.razorpayPaymentId,
              },
            });

          await tx.order.updateMany({
            where: {
              paymentTransactionId: paymentTransaction.id,
              status: 'CREATED',
            },
            data: {
              status: 'CONFIRMED',
            },
          });

          return updated;
        });

      return {
        received: true,
        processed: true,
        event,
        paymentTransactionId: updatedPayment.id,
        razorpayPaymentId: updatedPayment.razorpayPaymentId,
        status: updatedPayment.status,
      };
    }

    if (event === 'payment.failed') {
      if (
        paymentTransaction.status === 'PAID' ||
        paymentTransaction.status === 'REFUND_PENDING' ||
        paymentTransaction.status === 'REFUNDED'
      ) {
        return {
          received: true,
          processed: false,
          reason: `Payment transaction is already in ${paymentTransaction.status} state`,
          paymentTransactionId: paymentTransaction.id,
        };
      }

      const updatedPayment =
        await this.prisma.paymentTransaction.update({
          where: {
            id: paymentTransaction.id,
          },
          data: {
            status: 'FAILED',
            razorpayPaymentId:
              razorpayPaymentId ??
              paymentTransaction.razorpayPaymentId,
          },
        });

      return {
        received: true,
        processed: true,
        event,
        paymentTransactionId: updatedPayment.id,
        razorpayPaymentId: updatedPayment.razorpayPaymentId,
        status: updatedPayment.status,
      };
    }

    return {
      received: true,
      processed: false,
      reason: `Event ${event || 'unknown'} is not handled`,
    };
  }

  private async handleRefundWebhook(
    body: Record<string, unknown>,
  ) {
    const event =
      typeof body.event === 'string' ? body.event : '';

    const payload =
      body.payload &&
      typeof body.payload === 'object'
        ? (body.payload as Record<string, unknown>)
        : {};

    const refundPayload =
      payload.refund &&
      typeof payload.refund === 'object'
        ? (payload.refund as Record<string, unknown>)
        : {};

    const refundEntity =
      refundPayload.entity &&
      typeof refundPayload.entity === 'object'
        ? (refundPayload.entity as Record<string, unknown>)
        : {};

    const paymentPayload =
      payload.payment &&
      typeof payload.payment === 'object'
        ? (payload.payment as Record<string, unknown>)
        : {};

    const paymentEntity =
      paymentPayload.entity &&
      typeof paymentPayload.entity === 'object'
        ? (paymentPayload.entity as Record<string, unknown>)
        : {};

    const razorpayRefundId =
      typeof refundEntity.id === 'string'
        ? refundEntity.id
        : null;

    const razorpayPaymentId =
      typeof refundEntity.payment_id === 'string'
        ? refundEntity.payment_id
        : typeof paymentEntity.id === 'string'
          ? paymentEntity.id
          : null;

    const amount =
      typeof refundEntity.amount === 'number'
        ? refundEntity.amount
        : null;

    const razorpayRefundStatus =
      typeof refundEntity.status === 'string'
        ? refundEntity.status
        : null;

    if (!razorpayRefundId) {
      return {
        received: true,
        processed: false,
        event,
        reason: 'Razorpay refund ID not found in webhook payload',
      };
    }

    if (!razorpayPaymentId) {
      return {
        received: true,
        processed: false,
        event,
        reason: 'Razorpay payment ID not found in refund webhook payload',
      };
    }

    if (amount === null || !Number.isInteger(amount) || amount <= 0) {
      throw new BadRequestException(
        'Invalid refund amount in webhook payload',
      );
    }

    const refund =
      await this.prisma.refund.findUnique({
        where: {
          razorpayRefundId,
        },
        include: {
          paymentTransaction: true,
        },
      });

    if (!refund) {
      return {
        received: true,
        processed: false,
        event,
        reason: 'Refund record not found',
        refundId: razorpayRefundId,
      };
    }

    const paymentTransaction =
      refund.paymentTransaction;

    if (
      !paymentTransaction.razorpayPaymentId ||
      paymentTransaction.razorpayPaymentId !==
        razorpayPaymentId
    ) {
      throw new BadRequestException(
        'Razorpay refund payment ID does not match the payment transaction',
      );
    }

    if (refund.amountInPaise !== amount) {
      throw new BadRequestException(
        'Razorpay refund amount does not match the refund record',
      );
    }

    let nextRefundStatus:
      | 'PENDING'
      | 'PROCESSED'
      | 'FAILED';

    if (razorpayRefundStatus === 'processed') {
      nextRefundStatus = 'PROCESSED';
    } else if (razorpayRefundStatus === 'failed') {
      nextRefundStatus = 'FAILED';
    } else {
      nextRefundStatus = 'PENDING';
    }

    if (refund.status === 'PROCESSED') {
      return {
        received: true,
        processed: false,
        event,
        reason: 'Refund is already processed',
        refundId: refund.razorpayRefundId,
        paymentTransactionId:
          paymentTransaction.id,
        status: refund.status,
      };
    }

    if (refund.status === 'FAILED') {
      return {
        received: true,
        processed: false,
        event,
        reason: 'Refund has already failed',
        refundId: refund.razorpayRefundId,
        paymentTransactionId:
          paymentTransaction.id,
        status: refund.status,
      };
    }

    if (
      refund.status === nextRefundStatus
    ) {
      return {
        received: true,
        processed: false,
        event,
        reason: `Refund is already in ${refund.status} state`,
        refundId: refund.razorpayRefundId,
        paymentTransactionId:
          paymentTransaction.id,
        status: refund.status,
      };
    }

    const result =
      await this.prisma.$transaction(async (tx) => {
        const updatedRefund =
          await tx.refund.update({
            where: {
              id: refund.id,
            },
            data: {
              status: nextRefundStatus,
            },
          });

        const processedAggregate =
          await tx.refund.aggregate({
            where: {
              paymentTransactionId:
                paymentTransaction.id,
              status: 'PROCESSED',
            },
            _sum: {
              amountInPaise: true,
            },
          });

        const pendingCount =
          await tx.refund.count({
            where: {
              paymentTransactionId:
                paymentTransaction.id,
              status: 'PENDING',
            },
          });

        const cumulativeRefundedInPaise =
          processedAggregate._sum.amountInPaise ?? 0;

        let paymentStatus:
          | 'PAID'
          | 'REFUND_PENDING'
          | 'REFUNDED';

        if (
          cumulativeRefundedInPaise >=
          paymentTransaction.amountInPaise
        ) {
          paymentStatus = 'REFUNDED';
        } else if (pendingCount > 0) {
          paymentStatus = 'REFUND_PENDING';
        } else {
          paymentStatus = 'PAID';
        }

        const updatedPayment =
          await tx.paymentTransaction.update({
            where: {
              id: paymentTransaction.id,
            },
            data: {
              status: paymentStatus,
              refundedAmountInPaise:
                cumulativeRefundedInPaise,
            },
          });

        return {
          refund: updatedRefund,
          payment: updatedPayment,
          cumulativeRefundedInPaise,
        };
      });

    return {
      received: true,
      processed: true,
      event,
      refundId: result.refund.razorpayRefundId,
      paymentTransactionId:
        result.payment.id,
      refundStatus: result.refund.status,
      paymentStatus: result.payment.status,
      refundedAmountInPaise:
        result.cumulativeRefundedInPaise,
    };
  }
}
