import { SettlementCalculatorService } from './settlement-calculator.service';

describe('SettlementCalculatorService', () => {
  let service: SettlementCalculatorService;

  beforeEach(() => {
    service = new SettlementCalculatorService();
  });

  describe('calculate', () => {
    it('should calculate restaurant payable correctly', () => {
      const result = service.calculate({
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 10_000,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 5_000,
      });

      expect(result).toEqual({
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 10_000,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 5_000,
        restaurantPayableInPaise: 35_000,
      });
    });

    it('should calculate correctly when there is no refund or adjustment', () => {
      const result = service.calculate({
        grossAmountInPaise: 30_000,
        platformFeeInPaise: 3_000,
      });

      expect(result.restaurantPayableInPaise).toBe(27_000);
      expect(result.refundAmountInPaise).toBe(0);
      expect(result.adjustmentAmountInPaise).toBe(0);
    });

    it('should handle partial refunds', () => {
      const result = service.calculate({
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 15_000,
        platformFeeInPaise: 5_000,
      });

      expect(result.restaurantPayableInPaise).toBe(30_000);
    });

    it('should handle adjustments', () => {
      const result = service.calculate({
        grossAmountInPaise: 50_000,
        adjustmentAmountInPaise: 5_000,
        platformFeeInPaise: 5_000,
      });

      expect(result.restaurantPayableInPaise).toBe(40_000);
    });

    it('should reject refund greater than gross amount', () => {
      expect(() =>
        service.calculate({
          grossAmountInPaise: 10_000,
          refundAmountInPaise: 10_001,
          platformFeeInPaise: 0,
        }),
      ).toThrow('Refund amount cannot exceed gross amount');
    });

    it('should reject negative amounts', () => {
      expect(() =>
        service.calculate({
          grossAmountInPaise: -1,
        }),
      ).toThrow('grossAmountInPaise cannot be negative');
    });

    it('should reject decimal amounts', () => {
      expect(() =>
        service.calculate({
          grossAmountInPaise: 10_000.5,
        }),
      ).toThrow('grossAmountInPaise must be an integer');
    });

    it('should reject negative restaurant payable', () => {
      expect(() =>
        service.calculate({
          grossAmountInPaise: 10_000,
          refundAmountInPaise: 5_000,
          adjustmentAmountInPaise: 3_000,
          platformFeeInPaise: 3_000,
        }),
      ).toThrow('Restaurant payable amount cannot be negative');
    });
  });
});