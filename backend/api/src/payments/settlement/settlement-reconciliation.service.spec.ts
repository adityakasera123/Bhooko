import { SettlementReconciliationService } from './settlement-reconciliation.service';

describe('SettlementReconciliationService', () => {
  let service: SettlementReconciliationService;

  beforeEach(() => {
    service = new SettlementReconciliationService();
  });

  it('should reconcile when expected and recorded amounts match', () => {
    const result = service.reconcile({
      expectedRestaurantPayableInPaise: 45_000,
      recordedRestaurantPayableInPaise: 45_000,
    });

    expect(result).toEqual({
      isReconciled: true,
      differenceInPaise: 0,
    });
  });

  it('should detect when recorded amount is lower than expected', () => {
    const result = service.reconcile({
      expectedRestaurantPayableInPaise: 45_000,
      recordedRestaurantPayableInPaise: 40_000,
    });

    expect(result).toEqual({
      isReconciled: false,
      differenceInPaise: -5_000,
    });
  });

  it('should detect when recorded amount is higher than expected', () => {
    const result = service.reconcile({
      expectedRestaurantPayableInPaise: 40_000,
      recordedRestaurantPayableInPaise: 45_000,
    });

    expect(result).toEqual({
      isReconciled: false,
      differenceInPaise: 5_000,
    });
  });

  it('should handle zero settlement amounts', () => {
    const result = service.reconcile({
      expectedRestaurantPayableInPaise: 0,
      recordedRestaurantPayableInPaise: 0,
    });

    expect(result).toEqual({
      isReconciled: true,
      differenceInPaise: 0,
    });
  });

  it('should reject negative expected amount', () => {
    expect(() =>
      service.reconcile({
        expectedRestaurantPayableInPaise: -1,
        recordedRestaurantPayableInPaise: 0,
      }),
    ).toThrow(
      'expectedRestaurantPayableInPaise cannot be negative',
    );
  });

  it('should reject negative recorded amount', () => {
    expect(() =>
      service.reconcile({
        expectedRestaurantPayableInPaise: 0,
        recordedRestaurantPayableInPaise: -1,
      }),
    ).toThrow(
      'recordedRestaurantPayableInPaise cannot be negative',
    );
  });

  it('should reject decimal expected amount', () => {
    expect(() =>
      service.reconcile({
        expectedRestaurantPayableInPaise: 100.5,
        recordedRestaurantPayableInPaise: 100,
      }),
    ).toThrow(
      'expectedRestaurantPayableInPaise must be an integer',
    );
  });

  it('should reject decimal recorded amount', () => {
    expect(() =>
      service.reconcile({
        expectedRestaurantPayableInPaise: 100,
        recordedRestaurantPayableInPaise: 100.5,
      }),
    ).toThrow(
      'recordedRestaurantPayableInPaise must be an integer',
    );
  });
});