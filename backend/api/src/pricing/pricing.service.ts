import { Injectable } from '@nestjs/common';

export interface PricingInput {
  itemSubtotalInPaise: number;
}

export interface PricingResult {
  itemSubtotalInPaise: number;
  deliveryFeeInPaise: number;
  platformFeeInPaise: number;
  taxInPaise: number;
  discountInPaise: number;
  totalInPaise: number;
}

@Injectable()
export class PricingService {
  calculate(input: PricingInput): PricingResult {
    const {
      itemSubtotalInPaise,
    } = input;

    if (
      !Number.isInteger(itemSubtotalInPaise) ||
      itemSubtotalInPaise < 0
    ) {
      throw new Error('Invalid item subtotal');
    }

    const deliveryFeeInPaise = 0;
    const platformFeeInPaise = 0;
    const taxInPaise = 0;
    const discountInPaise = 0;

    const totalInPaise =
      itemSubtotalInPaise +
      deliveryFeeInPaise +
      platformFeeInPaise +
      taxInPaise -
      discountInPaise;

    return {
      itemSubtotalInPaise,
      deliveryFeeInPaise,
      platformFeeInPaise,
      taxInPaise,
      discountInPaise,
      totalInPaise,
    };
  }
}
