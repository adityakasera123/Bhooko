export interface ExternalPaymentRecord {
  id: string;
  orderId: string | null;
  amountInPaise: number;
  currency: string;
  status: string;
  createdAt: Date | null;
}

export interface ExternalRefundRecord {
  id: string;
  paymentId: string | null;
  amountInPaise: number;
  currency: string;
  status: string;
  createdAt: Date | null;
}

export interface PaymentFetchOptions {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

export interface RefundFetchOptions {
  from?: number;
  to?: number;
  count?: number;
  skip?: number;
}

export interface ReconciliationProvider {
  fetchPayment(
    paymentId: string,
  ): Promise<ExternalPaymentRecord>;

  fetchPaymentsByOrder(
    orderId: string,
  ): Promise<ExternalPaymentRecord[]>;

  fetchPayments(
    options?: PaymentFetchOptions,
  ): Promise<ExternalPaymentRecord[]>;

  fetchRefund(
    refundId: string,
  ): Promise<ExternalRefundRecord>;

  fetchRefundsForPayment(
    paymentId: string,
    options?: RefundFetchOptions,
  ): Promise<ExternalRefundRecord[]>;

  fetchRefunds(
    options?: RefundFetchOptions,
  ): Promise<ExternalRefundRecord[]>;
}