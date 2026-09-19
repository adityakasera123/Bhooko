import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';

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

    const orders = await this.prisma.order.findMany({
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

    const alreadyLinkedOrder = orders.find(
      (order) => order.paymentTransactionId !== null,
    );

    if (alreadyLinkedOrder) {
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
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const paymentTransaction = await this.prisma.paymentTransaction.create({
      data: {
        customerId: userId,
        status: 'CREATED',
        amountInPaise,
        currency: 'INR',
        orders: {
          connect: uniqueOrderIds.map((id) => ({
            id,
          })),
        },
      },
    });

    try {
      const razorpayOrder = await this.razorpayService.createOrder(
        amountInPaise,
        paymentTransaction.id,
      );

      const updatedPaymentTransaction =
        await this.prisma.paymentTransaction.update({
          where: {
            id: paymentTransaction.id,
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
        orderIds: uniqueOrderIds,
      };
    } catch (error) {
      await this.prisma.paymentTransaction.update({
        where: {
          id: paymentTransaction.id,
        },
        data: {
          status: 'FAILED',
        },
      });

      throw error;
    }
  }
}