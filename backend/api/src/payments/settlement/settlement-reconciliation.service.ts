import { Injectable } from '@nestjs/common';

export interface SettlementReconciliationInput {
  expectedRestaurantPayableInPaise: number;
  recordedRestaurantPayableInPaise: number;
}

export interface SettlementReconciliationResult {
  isReconciled: boolean;
  differenceInPaise: number;
}

@Injectable()
export class SettlementReconciliationService {
  reconcile(
    input: SettlementReconciliationInput,
  ): SettlementReconciliationResult {
    this.validateAmount(
      input.expectedRestaurantPayableInPaise,
      'expectedRestaurantPayableInPaise',
    );

    this.validateAmount(
      input.recordedRestaurantPayableInPaise,
      'recordedRestaurantPayableInPaise',
    );

    const differenceInPaise =
      input.recordedRestaurantPayableInPaise -
      input.expectedRestaurantPayableInPaise;

    return {
      isReconciled: differenceInPaise === 0,
      differenceInPaise,
    };
  }

  private validateAmount(
    value: number,
    fieldName: string,
  ): void {
    if (!Number.isInteger(value)) {
      throw new Error(
        `${fieldName} must be an integer`,
      );
    }

    if (value < 0) {
      throw new Error(
        `${fieldName} cannot be negative`,
      );
    }
  }
}