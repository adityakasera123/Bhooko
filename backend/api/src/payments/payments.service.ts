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

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpayService: RazorpayService,
  ) {}

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

        throw new ConflictException(
          'One or more orders are already linked to a payment transaction',
        );
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
}
