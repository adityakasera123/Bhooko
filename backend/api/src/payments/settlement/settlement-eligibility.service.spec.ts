import {
  OrderStatus,
  PaymentStatus,
} from '@prisma/client';
import { SettlementEligibilityService } from './settlement-eligibility.service';

describe('SettlementEligibilityService', () => {
  let service: SettlementEligibilityService;

  beforeEach(() => {
    service = new SettlementEligibilityService();
  });

  it('should mark settlement eligible when all conditions are satisfied', () => {
    expect(
      service.isEligible({
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        adjustmentWindowComplete: true,
      }),
    ).toBe(true);
  });

  it('should reject settlement when order is not delivered', () => {
    expect(
      service.isEligible({
        orderStatus: OrderStatus.PREPARING,
        paymentStatus: PaymentStatus.PAID,
        adjustmentWindowComplete: true,
      }),
    ).toBe(false);
  });

  it('should reject settlement when payment is not paid', () => {
    expect(
      service.isEligible({
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PENDING,
        adjustmentWindowComplete: true,
      }),
    ).toBe(false);
  });

  it('should reject settlement when adjustment window is incomplete', () => {
    expect(
      service.isEligible({
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        adjustmentWindowComplete: false,
      }),
    ).toBe(false);
  });

  it('should reject settlement when there is a blocking issue', () => {
    expect(
      service.isEligible({
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        adjustmentWindowComplete: true,
        hasBlockingIssue: true,
      }),
    ).toBe(false);
  });

  it('should allow settlement when hasBlockingIssue is omitted', () => {
    expect(
      service.isEligible({
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
        adjustmentWindowComplete: true,
      }),
    ).toBe(true);
  });
});