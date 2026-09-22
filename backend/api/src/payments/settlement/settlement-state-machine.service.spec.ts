import { SettlementStatus } from '@prisma/client';
import { SettlementStateMachineService } from './settlement-state-machine.service';

describe('SettlementStateMachineService', () => {
  let service: SettlementStateMachineService;

  beforeEach(() => {
    service = new SettlementStateMachineService();
  });

  describe('canTransition', () => {
    it('should allow PENDING -> ELIGIBLE', () => {
      expect(
        service.canTransition(
          SettlementStatus.PENDING,
          SettlementStatus.ELIGIBLE,
        ),
      ).toBe(true);
    });

    it('should allow ELIGIBLE -> PROCESSING', () => {
      expect(
        service.canTransition(
          SettlementStatus.ELIGIBLE,
          SettlementStatus.PROCESSING,
        ),
      ).toBe(true);
    });

    it('should allow PROCESSING -> SETTLED', () => {
      expect(
        service.canTransition(
          SettlementStatus.PROCESSING,
          SettlementStatus.SETTLED,
        ),
      ).toBe(true);
    });

    it('should allow transitions to ON_HOLD', () => {
      expect(
        service.canTransition(
          SettlementStatus.PENDING,
          SettlementStatus.ON_HOLD,
        ),
      ).toBe(true);

      expect(
        service.canTransition(
          SettlementStatus.ELIGIBLE,
          SettlementStatus.ON_HOLD,
        ),
      ).toBe(true);

      expect(
        service.canTransition(
          SettlementStatus.PROCESSING,
          SettlementStatus.ON_HOLD,
        ),
      ).toBe(true);
    });

    it('should allow recovery from ON_HOLD', () => {
      expect(
        service.canTransition(
          SettlementStatus.ON_HOLD,
          SettlementStatus.PENDING,
        ),
      ).toBe(true);

      expect(
        service.canTransition(
          SettlementStatus.ON_HOLD,
          SettlementStatus.ELIGIBLE,
        ),
      ).toBe(true);
    });

    it('should allow FAILED -> PENDING recovery', () => {
      expect(
        service.canTransition(
          SettlementStatus.FAILED,
          SettlementStatus.PENDING,
        ),
      ).toBe(true);
    });

    it('should allow the same state transition', () => {
      expect(
        service.canTransition(
          SettlementStatus.ELIGIBLE,
          SettlementStatus.ELIGIBLE,
        ),
      ).toBe(true);
    });

    it('should reject SETTLED -> PROCESSING', () => {
      expect(
        service.canTransition(
          SettlementStatus.SETTLED,
          SettlementStatus.PROCESSING,
        ),
      ).toBe(false);
    });

    it('should reject SETTLED -> FAILED', () => {
      expect(
        service.canTransition(
          SettlementStatus.SETTLED,
          SettlementStatus.FAILED,
        ),
      ).toBe(false);
    });

    it('should reject PENDING -> PROCESSING', () => {
      expect(
        service.canTransition(
          SettlementStatus.PENDING,
          SettlementStatus.PROCESSING,
        ),
      ).toBe(false);
    });

    it('should reject ELIGIBLE -> SETTLED', () => {
      expect(
        service.canTransition(
          SettlementStatus.ELIGIBLE,
          SettlementStatus.SETTLED,
        ),
      ).toBe(false);
    });
  });

  describe('transition', () => {
    it('should return the target state for a valid transition', () => {
      expect(
        service.transition(
          SettlementStatus.PENDING,
          SettlementStatus.ELIGIBLE,
        ),
      ).toBe(SettlementStatus.ELIGIBLE);
    });

    it('should throw for an invalid transition', () => {
      expect(() =>
        service.transition(
          SettlementStatus.SETTLED,
          SettlementStatus.PROCESSING,
        ),
      ).toThrow(
        'Invalid settlement status transition: SETTLED -> PROCESSING',
      );
    });
  });
});