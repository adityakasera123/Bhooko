import { Injectable } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';

export interface SettlementTransition {
  from: SettlementStatus;
  to: SettlementStatus;
}

@Injectable()
export class SettlementStateMachineService {
  private readonly transitions: ReadonlySet<string> =
    new Set([
      this.key(
        SettlementStatus.PENDING,
        SettlementStatus.ELIGIBLE,
      ),
      this.key(
        SettlementStatus.PENDING,
        SettlementStatus.ON_HOLD,
      ),
      this.key(
        SettlementStatus.PENDING,
        SettlementStatus.FAILED,
      ),

      this.key(
        SettlementStatus.ELIGIBLE,
        SettlementStatus.PROCESSING,
      ),
      this.key(
        SettlementStatus.ELIGIBLE,
        SettlementStatus.ON_HOLD,
      ),
      this.key(
        SettlementStatus.ELIGIBLE,
        SettlementStatus.FAILED,
      ),

      this.key(
        SettlementStatus.PROCESSING,
        SettlementStatus.SETTLED,
      ),
      this.key(
        SettlementStatus.PROCESSING,
        SettlementStatus.ON_HOLD,
      ),
      this.key(
        SettlementStatus.PROCESSING,
        SettlementStatus.FAILED,
      ),

      this.key(
        SettlementStatus.ON_HOLD,
        SettlementStatus.PENDING,
      ),
      this.key(
        SettlementStatus.ON_HOLD,
        SettlementStatus.ELIGIBLE,
      ),
      this.key(
        SettlementStatus.ON_HOLD,
        SettlementStatus.FAILED,
      ),

      this.key(
        SettlementStatus.FAILED,
        SettlementStatus.PENDING,
      ),
    ]);

  canTransition(
    from: SettlementStatus,
    to: SettlementStatus,
  ): boolean {
    if (from === to) {
      return true;
    }

    return this.transitions.has(this.key(from, to));
  }

  transition(
    from: SettlementStatus,
    to: SettlementStatus,
  ): SettlementStatus {
    if (!this.canTransition(from, to)) {
      throw new Error(
        `Invalid settlement status transition: ${from} -> ${to}`,
      );
    }

    return to;
  }

  private key(
    from: SettlementStatus,
    to: SettlementStatus,
  ): string {
    return `${from}:${to}`;
  }
}