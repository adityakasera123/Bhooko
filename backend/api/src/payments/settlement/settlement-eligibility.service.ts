 import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export interface SettlementEligibilityInput {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  adjustmentWindowComplete: boolean;
  hasBlockingIssue?: boolean;
}

@Injectable()
export class SettlementEligibilityService {
  isEligible(input: SettlementEligibilityInput): boolean {
    if (input.orderStatus !== OrderStatus.DELIVERED) {
      return false;
    }

    if (input.paymentStatus !== PaymentStatus.PAID) {
      return false;
    }

    if (!input.adjustmentWindowComplete) {
      return false;
    }

    if (input.hasBlockingIssue === true) {
      return false;
    }

    return true;
  }
}