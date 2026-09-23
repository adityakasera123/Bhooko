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

    if (paymentTransaction.status === 'REFUNDED') {
      return {
        message: 'Refund has already been completed',
        paymentTransactionId:
          paymentTransaction.id,
        refundId:
          paymentTransaction.refundId,
        refundedAmountInPaise:
          paymentTransaction.refundedAmountInPaise,
        status:
          paymentTransaction.status,
        orderIds:
          paymentTransaction.orders.map(
            (order) => order.id,
          ),
      };
    }

    if (
      !Number.isInteger(dto.amountInPaise) ||
      dto.amountInPaise <= 0
    ) {
      throw new BadRequestException(
        'Refund amount must be greater than zero',
      );
    }

    let refundReservation;

    try {
      refundReservation =
        await this.prisma.$transaction(
          async (tx) => {
            return this.reserveRefundInTransaction(
              tx,
              {
                paymentTransactionId,
                amountInPaise:
                  dto.amountInPaise,
                reason: dto.reason,
                idempotencyKey:
                  dto.idempotencyKey,
              },
            );
          },
        );
    } catch (error) {
      if (
        error instanceof
          Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrentRefund =
          await this.prisma.refund.findUnique({
            where: {
              paymentTransactionId_idempotencyKey: {
                paymentTransactionId,
                idempotencyKey:
                  dto.idempotencyKey,
              },
            },
          });

        if (concurrentRefund) {
          if (
            concurrentRefund.amountInPaise !==
            dto.amountInPaise
          ) {
            throw new ConflictException(
              'Idempotency key was already used for a different refund amount',
            );
          }

          return {
            message:
              concurrentRefund.status ===
              'PROCESSED'
                ? 'Refund has already been completed'
                : concurrentRefund.status ===
                    'FAILED'
                  ? 'Refund failed'
                  : 'Refund is already pending',
            paymentTransactionId,
            refundId:
              concurrentRefund.razorpayRefundId,
            refundedAmountInPaise:
              concurrentRefund.amountInPaise,
            status:
              concurrentRefund.status ===
              'PROCESSED'
                ? 'REFUNDED'
                : concurrentRefund.status ===
                    'FAILED'
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

    const updatedRefund =
      await this.executeReservedRefund(
        refundReservation.id,
      );

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
      processedAggregate._sum.amountInPaise ??
      0;

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
        updatedRefund.status === 'PROCESSED'
          ? paymentStatus === 'REFUNDED'
            ? 'Refund completed successfully'
            : 'Partial refund completed successfully'
          : updatedRefund.status === 'FAILED'
            ? 'Refund failed'
            : 'Refund initiated successfully',
      paymentTransactionId,
      refundId:
        updatedRefund.razorpayRefundId,
      refundedAmountInPaise:
        cumulativeRefundedInPaise,
      status: paymentStatus,
      orderIds:
        paymentTransaction.orders.map(
          (order) => order.id,
        ),
    };
  }

  async reserveRefundInTransaction(
    tx: Prisma.TransactionClient,
    input: {
      paymentTransactionId: string;
      amountInPaise: number;
      reason?: string;
      idempotencyKey: string;
      orderId?: string;
    },
  ) {
    if (
      !Number.isInteger(input.amountInPaise) ||
      input.amountInPaise <= 0
    ) {
      throw new BadRequestException(
        'Refund amount must be greater than zero',
      );
    }

    const existingRefund =
      await tx.refund.findUnique({
        where: {
          paymentTransactionId_idempotencyKey: {
            paymentTransactionId:
              input.paymentTransactionId,
            idempotencyKey:
              input.idempotencyKey,
          },
        },
      });

    if (existingRefund) {
      if (
        existingRefund.amountInPaise !==
        input.amountInPaise
      ) {
        throw new ConflictException(
          'Idempotency key was already used for a different refund amount',
        );
      }

      if (
        input.orderId &&
        existingRefund.orderId &&
        existingRefund.orderId !==
          input.orderId
      ) {
        throw new ConflictException(
          'Refund idempotency key is already associated with a different order',
        );
      }

      return existingRefund;
    }

    const paymentTransaction =
      await tx.paymentTransaction.findUnique({
        where: {
          id: input.paymentTransactionId,
        },
      });

    if (!paymentTransaction) {
      throw new NotFoundException(
        'Payment transaction not found',
      );
    }

    if (
      paymentTransaction.status !== 'PAID' &&
      paymentTransaction.status !==
        'REFUND_PENDING'
    ) {
      throw new BadRequestException(
        `Payment transaction cannot be refunded from status ${paymentTransaction.status}`,
      );
    }

    if (!paymentTransaction.razorpayPaymentId) {
      throw new BadRequestException(
        'Payment transaction is not linked to a Razorpay payment',
      );
    }

    await tx.$queryRaw`
      SELECT id
      FROM "PaymentTransaction"
      WHERE id = ${paymentTransaction.id}
      FOR UPDATE
    `;

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

    if (
      lockedPayment.status !== 'PAID' &&
      lockedPayment.status !==
        'REFUND_PENDING'
    ) {
      throw new ConflictException(
        `Payment transaction is no longer refundable from status ${lockedPayment.status}`,
      );
    }

    if (!lockedPayment.razorpayPaymentId) {
      throw new BadRequestException(
        'Payment transaction is not linked to a Razorpay payment',
      );
    }

    const processedAggregate =
      await tx.refund.aggregate({
        where: {
          paymentTransactionId:
            lockedPayment.id,
          status: 'PROCESSED',
        },
        _sum: {
          amountInPaise: true,
        },
      });

    const refundedSoFarInPaise =
      processedAggregate._sum.amountInPaise ??
      0;

    const pendingRefundAggregate =
      await tx.refund.aggregate({
        where: {
          paymentTransactionId:
            lockedPayment.id,
          status: 'PENDING',
        },
        _sum: {
          amountInPaise: true,
        },
      });

    const pendingRefundAmountInPaise =
      pendingRefundAggregate._sum.amountInPaise ??
      0;

    const remainingRefundableInPaise =
      lockedPayment.amountInPaise -
      refundedSoFarInPaise -
      pendingRefundAmountInPaise;

    if (
      input.amountInPaise >
      remainingRefundableInPaise
    ) {
      throw new BadRequestException(
        `Refund amount cannot exceed the remaining refundable amount of ${remainingRefundableInPaise} paise`,
      );
    }

    const refundData = {
      paymentTransactionId:
        lockedPayment.id,
      razorpayRefundId: null,
      amountInPaise:
        input.amountInPaise,
      status: 'PENDING' as const,
      reason: input.reason,
      idempotencyKey:
        input.idempotencyKey,
      ...(input.orderId
        ? { orderId: input.orderId }
        : {}),
    };

    const createdRefund =
      await tx.refund.create({
        data: refundData,
      });

    await tx.paymentTransaction.update({
      where: {
        id: lockedPayment.id,
      },
      data: {
        status: 'REFUND_PENDING',
        refundId: null,
        refundReason: input.reason,
        refundedAmountInPaise:
          refundedSoFarInPaise,
      },
    });

    return createdRefund;
  }

  private async reserveCancelledOrderRefundsInTransaction(
  tx: Prisma.TransactionClient,
  paymentTransactionId: string,
) {
 const cancelledOrders = await tx.order.findMany({
  where: {
    paymentTransactionId,
    status: 'CANCELLED',
    cancellationSource: 'RESTAURANT',
  },
    select: {
      id: true,
      totalInPaise: true,
    },
  });

  const refundReservations = [];

  for (const order of cancelledOrders) {
    const refund = await this.reserveRefundInTransaction(tx, {
      paymentTransactionId,
      amountInPaise: order.totalInPaise,
      reason: 'Restaurant rejected order',
      idempotencyKey: `restaurant-rejection:${order.id}`,
      orderId: order.id,
    });

    refundReservations.push(refund);
  }

  return refundReservations;
}

   async executeReservedRefund(
    refundId: string,
  ) {
    const refund =
      await this.prisma.refund.findUnique({
        where: {
          id: refundId,
        },
      });

    if (!refund) {
      throw new NotFoundException(
        'Refund reservation not found',
      );
    }

    const paymentTransaction =
      await this.prisma.paymentTransaction.findUnique({
        where: {
          id: refund.paymentTransactionId,
        },
      });

    if (!paymentTransaction) {
      throw new NotFoundException(
        'Payment transaction not found',
      );
    }

    if (
      refund.status === 'PROCESSED' ||
      refund.status === 'FAILED'
    ) {
      return refund;
    }

    if (
      refund.status === 'PENDING' &&
      refund.razorpayRefundId
    ) {
      return refund;
    }

    if (!paymentTransaction.razorpayPaymentId) {
      throw new BadRequestException(
        'Payment transaction is not linked to a Razorpay payment',
      );
    }

    let razorpayRefund;

    try {
      razorpayRefund =
        await this.razorpayService.createRefund(
          paymentTransaction.razorpayPaymentId,
          refund.amountInPaise,
          paymentTransaction.id,
        );
    } catch (error) {
      /*
       * The Razorpay request may have reached the
       * provider even when the network request failed.
       *
       * Keep the reservation PENDING so that
       * webhook/reconciliation can safely resolve it.
       */
      throw error;
    }

    if (
      razorpayRefund.amount !==
      refund.amountInPaise
    ) {
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

    return this.prisma.$transaction(
      async (tx) => {
        const currentRefund =
          await tx.refund.findUnique({
            where: {
              id: refundId,
            },
          });

        if (!currentRefund) {
          throw new NotFoundException(
            'Refund reservation not found',
          );
        }

        if (
          currentRefund.status === 'PROCESSED' ||
          currentRefund.status === 'FAILED'
        ) {
          return currentRefund;
        }

        if (currentRefund.razorpayRefundId) {
          return currentRefund;
        }

        const updatedRefund =
          await tx.refund.update({
            where: {
              id: currentRefund.id,
            },
            data: {
              razorpayRefundId:
                razorpayRefund.id,
              status:
                internalRefundStatus,
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

        const cumulativeRefundedInPaise =
          processedAggregate._sum.amountInPaise ??
          0;

        const pendingCount =
          await tx.refund.count({
            where: {
              paymentTransactionId:
                paymentTransaction.id,
              status: 'PENDING',
            },
          });

        const nextPaymentStatus =
          cumulativeRefundedInPaise >=
          paymentTransaction.amountInPaise
            ? 'REFUNDED'
            : pendingCount > 0
              ? 'REFUND_PENDING'
              : 'PAID';

        await tx.paymentTransaction.update({
          where: {
            id: paymentTransaction.id,
          },
          data: {
            status: nextPaymentStatus,
            refundId:
              razorpayRefund.id,
            refundedAmountInPaise:
              cumulativeRefundedInPaise,
            refundReason:
              currentRefund.reason,
          },
        });

        return updatedRefund;
      },
    );
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

    const verificationResult =
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

    const refundReservations =
      await this.reserveCancelledOrderRefundsInTransaction(
        tx,
        paymentTransaction.id,
      );

    return {
      updatedPayment,
      refundReservations,
    };
  });

const updatedPaymentTransaction =
  verificationResult.updatedPayment;

for (const refund of verificationResult.refundReservations) {
  await this.executeReservedRefund(refund.id);
}

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

     const captureResult =
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

    const refundReservations =
      await this.reserveCancelledOrderRefundsInTransaction(
        tx,
        paymentTransaction.id,
      );

    return {
      updatedPayment: updated,
      refundReservations,
    };
  });

for (const refund of captureResult.refundReservations) {
  await this.executeReservedRefund(refund.id);
}

const updatedPayment =
  captureResult.updatedPayment;

return {
  received: true,
  processed: true,
  event,
  paymentTransactionId: updatedPayment.id,
  razorpayPaymentId: updatedPayment.razorpayPaymentId,
  status: updatedPayment.status,
};

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
