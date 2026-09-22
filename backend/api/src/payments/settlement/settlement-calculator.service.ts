import { Injectable } from '@nestjs/common';

export interface SettlementCalculationInput {
  grossAmountInPaise: number;
  refundAmountInPaise?: number;
  adjustmentAmountInPaise?: number;
  platformFeeInPaise?: number;
}

export interface SettlementCalculationResult {
  grossAmountInPaise: number;
  refundAmountInPaise: number;
  adjustmentAmountInPaise: number;
  platformFeeInPaise: number;
  restaurantPayableInPaise: number;
}

@Injectable()
export class SettlementCalculatorService {
  calculate(
    input: SettlementCalculationInput,
  ): SettlementCalculationResult {
    const grossAmountInPaise = this.validateAmount(
      input.grossAmountInPaise,
      'grossAmountInPaise',
    );

    const refundAmountInPaise = this.validateAmount(
      input.refundAmountInPaise ?? 0,
      'refundAmountInPaise',
    );

    const adjustmentAmountInPaise = this.validateAmount(
      input.adjustmentAmountInPaise ?? 0,
      'adjustmentAmountInPaise',
    );

    const platformFeeInPaise = this.validateAmount(
      input.platformFeeInPaise ?? 0,
      'platformFeeInPaise',
    );

    if (refundAmountInPaise > grossAmountInPaise) {
      throw new Error('Refund amount cannot exceed gross amount');
    }

    const restaurantPayableInPaise =
      grossAmountInPaise -
      refundAmountInPaise -
      adjustmentAmountInPaise -
      platformFeeInPaise;

    if (restaurantPayableInPaise < 0) {
      throw new Error('Restaurant payable amount cannot be negative');
    }

    return {
      grossAmountInPaise,
      refundAmountInPaise,
      adjustmentAmountInPaise,
      platformFeeInPaise,
      restaurantPayableInPaise,
    };
  }

  private validateAmount(value: number, fieldName: string): number {
    if (!Number.isInteger(value)) {
      throw new Error(`${fieldName} must be an integer`);
    }

    if (value < 0) {
      throw new Error(`${fieldName} cannot be negative`);
    }

    return value;
  }
}