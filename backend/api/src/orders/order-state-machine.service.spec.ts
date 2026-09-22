import { ForbiddenException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrderStateMachineService } from './order-state-machine.service';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(() => {
    service = new OrderStateMachineService();
  });

  describe('canTransition', () => {
    it('should allow CREATED -> CONFIRMED', () => {
      expect(
        service.canTransition(
          OrderStatus.CREATED,
          OrderStatus.CONFIRMED,
        ),
      ).toBe(true);
    });

    it('should allow CREATED -> CANCELLED', () => {
      expect(
        service.canTransition(
          OrderStatus.CREATED,
          OrderStatus.CANCELLED,
        ),
      ).toBe(true);
    });

    it('should allow CONFIRMED -> PREPARING', () => {
      expect(
        service.canTransition(
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
        ),
      ).toBe(true);
    });

    it('should allow PREPARING -> READY', () => {
      expect(
        service.canTransition(
          OrderStatus.PREPARING,
          OrderStatus.READY,
        ),
      ).toBe(true);
    });

    it('should allow READY -> OUT_FOR_DELIVERY', () => {
      expect(
        service.canTransition(
          OrderStatus.READY,
          OrderStatus.OUT_FOR_DELIVERY,
        ),
      ).toBe(true);
    });

    it('should allow OUT_FOR_DELIVERY -> DELIVERED', () => {
      expect(
        service.canTransition(
          OrderStatus.OUT_FOR_DELIVERY,
          OrderStatus.DELIVERED,
        ),
      ).toBe(true);
    });

    it('should reject invalid backward transition', () => {
      expect(
        service.canTransition(
          OrderStatus.PREPARING,
          OrderStatus.CREATED,
        ),
      ).toBe(false);
    });

    it('should reject transition from DELIVERED', () => {
      expect(
        service.canTransition(
          OrderStatus.DELIVERED,
          OrderStatus.CANCELLED,
        ),
      ).toBe(false);
    });

    it('should reject transition from CANCELLED', () => {
      expect(
        service.canTransition(
          OrderStatus.CANCELLED,
          OrderStatus.CONFIRMED,
        ),
      ).toBe(false);
    });
  });

  describe('assertTransitionAllowed', () => {
    it('should not throw for a valid transition', () => {
      expect(() =>
        service.assertTransitionAllowed(
          OrderStatus.CREATED,
          OrderStatus.CONFIRMED,
        ),
      ).not.toThrow();
    });

    it('should throw ForbiddenException for an invalid transition', () => {
      expect(() =>
        service.assertTransitionAllowed(
          OrderStatus.PREPARING,
          OrderStatus.CONFIRMED,
        ),
      ).toThrow(ForbiddenException);
    });
  });
});