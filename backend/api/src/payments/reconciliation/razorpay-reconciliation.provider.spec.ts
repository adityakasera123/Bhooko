import { jest } from '@jest/globals';

import { RazorpayReconciliationProvider } from './razorpay-reconciliation.provider';
import { RazorpayService } from '../razorpay.service';

describe('RazorpayReconciliationProvider', () => {
  let provider: RazorpayReconciliationProvider;

 const razorpayServiceMock = {
  fetchPayment: jest.fn<() => Promise<unknown>>(),
  fetchPaymentsByOrder: jest.fn<() => Promise<unknown>>(),
  fetchPayments: jest.fn<() => Promise<unknown>>(),
  fetchRefund: jest.fn<() => Promise<unknown>>(),
  fetchRefundsForPayment: jest.fn<() => Promise<unknown>>(),
  fetchRefunds: jest.fn<() => Promise<unknown>>(),
};

  beforeEach(() => {
    jest.clearAllMocks();

    provider = new RazorpayReconciliationProvider(
      razorpayServiceMock as unknown as RazorpayService,
    );
  });

  describe('fetchPayment', () => {
    it('should normalize a Razorpay payment', async () => {
      razorpayServiceMock.fetchPayment.mockResolvedValue({
        id: 'pay_123',
        order_id: 'order_123',
        amount: '50000',
        currency: 'INR',
        status: 'captured',
        created_at: 1758451200,
      });

      const result = await provider.fetchPayment('pay_123');

      expect(result).toEqual({
        id: 'pay_123',
        orderId: 'order_123',
        amountInPaise: 50000,
        currency: 'INR',
        status: 'captured',
        createdAt: new Date(1758451200 * 1000),
      });

      expect(
        razorpayServiceMock.fetchPayment,
      ).toHaveBeenCalledWith('pay_123');
    });
  });

  describe('fetchPaymentsByOrder', () => {
    it('should normalize all payments for an order', async () => {
      razorpayServiceMock.fetchPaymentsByOrder.mockResolvedValue({
        items: [
          {
            id: 'pay_1',
            order_id: 'order_123',
            amount: 10000,
            currency: 'INR',
            status: 'captured',
            created_at: 1758451200,
          },
          {
            id: 'pay_2',
            order_id: 'order_123',
            amount: '20000',
            currency: 'INR',
            status: 'failed',
          },
        ],
      });

      const result =
        await provider.fetchPaymentsByOrder('order_123');

      expect(result).toHaveLength(2);

      expect(result[0]).toEqual({
        id: 'pay_1',
        orderId: 'order_123',
        amountInPaise: 10000,
        currency: 'INR',
        status: 'captured',
        createdAt: new Date(1758451200 * 1000),
      });

      expect(result[1]).toEqual({
        id: 'pay_2',
        orderId: 'order_123',
        amountInPaise: 20000,
        currency: 'INR',
        status: 'failed',
        createdAt: null,
      });
    });
  });

  describe('fetchPayments', () => {
    it('should normalize paginated payment results', async () => {
      razorpayServiceMock.fetchPayments.mockResolvedValue({
        items: [
          {
            id: 'pay_456',
            order_id: 'order_456',
            amount: 7500,
            currency: 'INR',
            status: 'captured',
          },
        ],
      });

      const result = await provider.fetchPayments({
        from: 1758450000,
        to: 1758460000,
        count: 10,
        skip: 0,
      });

      expect(result).toEqual([
        {
          id: 'pay_456',
          orderId: 'order_456',
          amountInPaise: 7500,
          currency: 'INR',
          status: 'captured',
          createdAt: null,
        },
      ]);

      expect(
        razorpayServiceMock.fetchPayments,
      ).toHaveBeenCalledWith({
        from: 1758450000,
        to: 1758460000,
        count: 10,
        skip: 0,
      });
    });
  });

  describe('fetchRefund', () => {
    it('should normalize a Razorpay refund', async () => {
      razorpayServiceMock.fetchRefund.mockResolvedValue({
        id: 'rfnd_123',
        payment_id: 'pay_123',
        amount: 15000,
        currency: 'INR',
        status: 'processed',
        created_at: 1758451200,
      });

      const result = await provider.fetchRefund('rfnd_123');

      expect(result).toEqual({
        id: 'rfnd_123',
        paymentId: 'pay_123',
        amountInPaise: 15000,
        currency: 'INR',
        status: 'processed',
        createdAt: new Date(1758451200 * 1000),
      });
    });
  });

  describe('fetchRefundsForPayment', () => {
    it('should normalize refunds for a payment', async () => {
      razorpayServiceMock.fetchRefundsForPayment.mockResolvedValue({
        items: [
          {
            id: 'rfnd_1',
            payment_id: 'pay_123',
            amount: 5000,
            status: 'processed',
          },
          {
            id: 'rfnd_2',
            payment_id: 'pay_123',
            amount: 2500,
            currency: 'INR',
            status: 'pending',
          },
        ],
      });

      const result =
        await provider.fetchRefundsForPayment('pay_123');

      expect(result).toEqual([
        {
          id: 'rfnd_1',
          paymentId: 'pay_123',
          amountInPaise: 5000,
          currency: 'INR',
          status: 'processed',
          createdAt: null,
        },
        {
          id: 'rfnd_2',
          paymentId: 'pay_123',
          amountInPaise: 2500,
          currency: 'INR',
          status: 'pending',
          createdAt: null,
        },
      ]);
    });
  });

  describe('fetchRefunds', () => {
    it('should normalize paginated refund results', async () => {
      razorpayServiceMock.fetchRefunds.mockResolvedValue({
        items: [
          {
            id: 'rfnd_456',
            payment_id: 'pay_456',
            amount: 9000,
            currency: 'INR',
            status: 'processed',
          },
        ],
      });

      const result = await provider.fetchRefunds({
        from: 1758450000,
        to: 1758460000,
        count: 10,
        skip: 0,
      });

      expect(result).toEqual([
        {
          id: 'rfnd_456',
          paymentId: 'pay_456',
          amountInPaise: 9000,
          currency: 'INR',
          status: 'processed',
          createdAt: null,
        },
      ]);
    });
  });

  describe('invalid external data', () => {
    it('should reject an invalid payment amount', async () => {
      razorpayServiceMock.fetchPayment.mockResolvedValue({
        id: 'pay_invalid',
        order_id: 'order_invalid',
        amount: 'invalid',
        currency: 'INR',
        status: 'captured',
      });

      await expect(
        provider.fetchPayment('pay_invalid'),
      ).rejects.toThrow(
        'Invalid Razorpay payment amount for payment pay_invalid',
      );
    });

    it('should reject an invalid refund amount', async () => {
      razorpayServiceMock.fetchRefund.mockResolvedValue({
        id: 'rfnd_invalid',
        payment_id: 'pay_invalid',
        amount: undefined,
        currency: 'INR',
        status: 'processed',
      });

      await expect(
        provider.fetchRefund('rfnd_invalid'),
      ).rejects.toThrow(
        'Invalid Razorpay refund amount for refund rfnd_invalid',
      );
    });
  });
});