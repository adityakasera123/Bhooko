import { Injectable } from '@nestjs/common';

import { RazorpayService } from '../razorpay.service';
import {
  ExternalPaymentRecord,
  ExternalRefundRecord,
  PaymentFetchOptions,
  RefundFetchOptions,
  ReconciliationProvider,
} from './types/reconciliation-provider.types';

@Injectable()
export class RazorpayReconciliationProvider
  implements ReconciliationProvider
{
  constructor(
    private readonly razorpayService: RazorpayService,
  ) {}

  async fetchPayment(
    paymentId: string,
  ): Promise<ExternalPaymentRecord> {
    const payment =
      await this.razorpayService.fetchPayment(paymentId);

    return this.mapPayment(payment);
  }

  async fetchPaymentsByOrder(
    orderId: string,
  ): Promise<ExternalPaymentRecord[]> {
    const response =
      await this.razorpayService.fetchPaymentsByOrder(orderId);

    return response.items.map((payment) =>
      this.mapPayment(payment),
    );
  }

  async fetchPayments(
    options?: PaymentFetchOptions,
  ): Promise<ExternalPaymentRecord[]> {
    const response =
      await this.razorpayService.fetchPayments(options);

    return response.items.map((payment) =>
      this.mapPayment(payment),
    );
  }

  async fetchRefund(
    refundId: string,
  ): Promise<ExternalRefundRecord> {
    const refund =
      await this.razorpayService.fetchRefund(refundId);

    return this.mapRefund(refund);
  }

  async fetchRefundsForPayment(
    paymentId: string,
    options?: RefundFetchOptions,
  ): Promise<ExternalRefundRecord[]> {
    const response =
      await this.razorpayService.fetchRefundsForPayment(
        paymentId,
        options,
      );

    return response.items.map((refund) =>
      this.mapRefund(refund),
    );
  }

  async fetchRefunds(
    options?: RefundFetchOptions,
  ): Promise<ExternalRefundRecord[]> {
    const response =
      await this.razorpayService.fetchRefunds(options);

    return response.items.map((refund) =>
      this.mapRefund(refund),
    );
  }

  private mapPayment(
  payment: {
    id: string;
    order_id?: string | null;
    amount: string | number;
    currency: string;
    status: string;
    created_at?: number;
  },
): ExternalPaymentRecord {
  const amountInPaise = Number(payment.amount);

  if (!Number.isInteger(amountInPaise) || amountInPaise <= 0) {
    throw new Error(
      `Invalid Razorpay payment amount for payment ${payment.id}`,
    );
  }

  return {
    id: payment.id,
    orderId: payment.order_id ?? null,
    amountInPaise,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.created_at
      ? new Date(payment.created_at * 1000)
      : null,
  };
}

  private mapRefund(
  refund: {
    id: string;
    payment_id?: string | null;
    amount?: number;
    currency?: string;
    status: string;
    created_at?: number;
  },
): ExternalRefundRecord {
  if (
    refund.amount === undefined ||
    !Number.isInteger(refund.amount) ||
    refund.amount <= 0
  ) {
    throw new Error(
      `Invalid Razorpay refund amount for refund ${refund.id}`,
    );
  }

  return {
    id: refund.id,
    paymentId: refund.payment_id ?? null,
    amountInPaise: refund.amount,
    currency: refund.currency ?? 'INR',
    status: refund.status,
    createdAt: refund.created_at
      ? new Date(refund.created_at * 1000)
      : null,
  };
}
}