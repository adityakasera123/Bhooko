export type ReconciliationEntityType =
  | 'PAYMENT'
  | 'REFUND';

export type ReconciliationResultStatus =
  | 'MATCHED'
  | 'MISMATCH';

export type ReconciliationMismatchType =
  | 'NONE'
  | 'STATUS_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'CURRENCY_MISMATCH'
  | 'IDENTITY_MISMATCH'
  | 'MISSING_EXTERNAL_REFERENCE'
  | 'EXTERNAL_RECORD_MISSING'
  | 'LOCAL_RECORD_MISSING'
  | 'REFUND_STATUS_MISMATCH'
  | 'REFUND_AMOUNT_MISMATCH'
  | 'DUPLICATE_CONFLICT'
  | 'UNKNOWN';

export interface PaymentReconciliationLocalRecord {
  id: string;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  amountInPaise: number;
  currency: string;
  status: string;
}

export interface RefundReconciliationLocalRecord {
  id: string;
  razorpayRefundId: string | null;
  razorpayPaymentId: string | null;
  amountInPaise: number;
  currency: string;
  status: string;
}

export interface ReconciliationVerification {
  identityMatched: boolean;
  mappingMatched: boolean;
  amountMatched: boolean;
  currencyMatched: boolean;
  statusMatched: boolean;
}

export interface ReconciliationMatchResult {
  entityType: ReconciliationEntityType;
  resultStatus: ReconciliationResultStatus;
  mismatchType: ReconciliationMismatchType;
  mismatchTypes: ReconciliationMismatchType[];
  verification: ReconciliationVerification;
  localState: string | null;
  externalState: string | null;
  reason: string;
}