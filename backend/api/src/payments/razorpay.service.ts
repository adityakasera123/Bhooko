import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';

import Razorpay from 'razorpay';

@Injectable()
export class RazorpayService {
  private readonly razorpay: Razorpay;

  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new InternalServerErrorException(
        'Razorpay credentials are not configured',
      );
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(amountInPaise: number, receipt: string) {
    return this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
    });
  }
  
  async createRefund(
  razorpayPaymentId: string,
  amountInPaise: number,
  receipt: string,
) {
  return this.razorpay.payments.refund(
    razorpayPaymentId,
    {
      amount: amountInPaise,
      speed: 'normal',
      receipt,
    },
  );
}

  // ---------------------------------------------------------------------------
  // Reconciliation - Read-only provider fetch methods
  // ---------------------------------------------------------------------------

  async fetchPayment(paymentId: string) {
    return this.razorpay.payments.fetch(paymentId);
  }

  async fetchPaymentsByOrder(orderId: string) {
    return this.razorpay.orders.fetchPayments(orderId);
  }

  async fetchPayments(options?: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }) {
    return this.razorpay.payments.all(options);
  }

  async fetchRefund(refundId: string) {
    return this.razorpay.refunds.fetch(refundId);
  }

  async fetchRefundForPayment(
    paymentId: string,
    refundId: string,
  ) {
    return this.razorpay.payments.fetchRefund(
      paymentId,
      refundId,
    );
  }

  async fetchRefundsForPayment(
    paymentId: string,
    options?: {
      from?: number;
      to?: number;
      count?: number;
      skip?: number;
    },
  ) {
    return this.razorpay.payments.fetchMultipleRefund(
      paymentId,
      options,
    );
  }

  async fetchRefunds(options?: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }) {
    return this.razorpay.refunds.all(options);
  }

  verifyWebhookSignature(
    rawBody: Buffer,
    signature: string,
  ): boolean {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return false;
    }

    const expectedSignature = createHmac(
      'sha256',
      webhookSecret,
    )
      .update(rawBody)
      .digest('hex');

    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(signature, 'utf8');

    if (expected.length !== received.length) {
      return false;
    }

    return timingSafeEqual(expected, received);
  }
}
