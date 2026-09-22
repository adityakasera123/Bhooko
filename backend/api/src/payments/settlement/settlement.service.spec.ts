import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettlementCalculatorService } from './settlement-calculator.service';
import { SettlementEligibilityService } from './settlement-eligibility.service';
import { SettlementService } from './settlement.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';

type MockOrder = {
  id: string;
  restaurantId: string;
  status: string;
  totalInPaise: number;
  platformFeeInPaise: number;
  paymentTransaction: {
    id: string;
    status: string;
    refunds: {
      id: string;
      amountInPaise: number;
      status: string;
    }[];
  } | null;
  settlement: {
    id: string;
    status: SettlementStatus;
    grossAmountInPaise: number;
    refundAmountInPaise: number;
    adjustmentAmountInPaise: number;
    platformFeeInPaise: number;
    restaurantPayableInPaise: number;
  } | null;
};

type MockSettlement = {
  id: string;
  status: SettlementStatus;
  grossAmountInPaise: number;
  refundAmountInPaise: number;
  adjustmentAmountInPaise: number;
  platformFeeInPaise: number;
  restaurantPayableInPaise: number;
};

type TxMock = {
  order: {
    findUnique: jest.MockedFunction<
      () => Promise<MockOrder | null>
    >;
  };
  settlement: {
    create: jest.MockedFunction<
      () => Promise<MockSettlement>
    >;
  };
};

type TransactionMock = jest.MockedFunction<
  <T>(
    callback: (tx: TxMock) => Promise<T>,
  ) => Promise<T>
>;

describe('SettlementService', () => {
  let service: SettlementService;

  const txMock: TxMock = {
    order: {
      findUnique:
        jest.fn() as TxMock['order']['findUnique'],
    },
    settlement: {
      create:
        jest.fn() as TxMock['settlement']['create'],
    },
  };

  const transactionMock =
    jest.fn() as TransactionMock;

  const prismaMock = {
    $transaction: transactionMock,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    transactionMock.mockImplementation(
      async <T>(
        callback: (tx: TxMock) => Promise<T>,
      ): Promise<T> => {
        return callback(txMock);
      },
    );

   service = new SettlementService(
  prismaMock as unknown as PrismaService,
  new SettlementCalculatorService(),
  new SettlementEligibilityService(),
  new SettlementStateMachineService(),
);
  });

  it('should throw when order does not exist', async () => {
    txMock.order.findUnique.mockResolvedValue(null);

    await expect(
      service.createSettlement({
        orderId: 'order-1',
        adjustmentWindowComplete: true,
      }),
    ).rejects.toThrow(
      new NotFoundException('Order not found'),
    );

    expect(
      txMock.settlement.create,
    ).not.toHaveBeenCalled();
  });

  it('should throw when order has no payment transaction', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: null,
      settlement: null,
    });

    await expect(
      service.createSettlement({
        orderId: 'order-1',
        adjustmentWindowComplete: true,
      }),
    ).rejects.toThrow(
      'Order has no payment transaction',
    );

    expect(
      txMock.settlement.create,
    ).not.toHaveBeenCalled();
  });

  it('should create an eligible settlement when all conditions are satisfied', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-1',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-1',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-1',
      adjustmentWindowComplete: true,
    });

    expect(result.settlementId).toBe('settlement-1');
    expect(result.status).toBe(
      SettlementStatus.ELIGIBLE,
    );

    expect(result.calculation).toEqual({
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    });

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-1',
        restaurantId: 'restaurant-1',
        paymentTransactionId: 'payment-1',
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 0,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 5_000,
        restaurantPayableInPaise: 45_000,
        status: SettlementStatus.ELIGIBLE,
        eligibleAt: expect.any(Date),
      }),
    });
  });

  it('should create a pending settlement when eligibility conditions are not satisfied', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-2',
      restaurantId: 'restaurant-1',
      status: 'PREPARING',
      totalInPaise: 30_000,
      platformFeeInPaise: 3_000,
      paymentTransaction: {
        id: 'payment-2',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-2',
      status: SettlementStatus.PENDING,
      grossAmountInPaise: 30_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 3_000,
      restaurantPayableInPaise: 27_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-2',
      adjustmentWindowComplete: true,
    });

    expect(result.status).toBe(
      SettlementStatus.PENDING,
    );

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: SettlementStatus.PENDING,
        eligibleAt: null,
      }),
    });
  });

  it('should include only processed refunds in settlement calculation', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-3',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-3',
        status: 'PAID',
        refunds: [
          {
            id: 'refund-1',
            amountInPaise: 10_000,
            status: 'PROCESSED',
          },
          {
            id: 'refund-2',
            amountInPaise: 5_000,
            status: 'PROCESSED',
          },
        ],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-3',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 15_000,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 30_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-3',
      adjustmentWindowComplete: true,
    });

    expect(
      result.calculation.refundAmountInPaise,
    ).toBe(15_000);

    expect(
      result.calculation.restaurantPayableInPaise,
    ).toBe(30_000);
  });

  it('should include adjustment amount in settlement calculation', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-4',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-4',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-4',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 5_000,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 40_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-4',
      adjustmentWindowComplete: true,
      adjustmentAmountInPaise: 5_000,
    });

    expect(
      result.calculation.adjustmentAmountInPaise,
    ).toBe(5_000);

    expect(
      result.calculation.restaurantPayableInPaise,
    ).toBe(40_000);
  });

  it('should return the existing settlement and not create a duplicate', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-5',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-5',
        status: 'PAID',
        refunds: [],
      },
      settlement: {
        id: 'settlement-existing',
        status: SettlementStatus.ELIGIBLE,
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 5_000,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 5_000,
        restaurantPayableInPaise: 40_000,
      },
    });

    const result = await service.createSettlement({
      orderId: 'order-5',
      adjustmentWindowComplete: true,
    });

    expect(result).toEqual({
      settlementId: 'settlement-existing',
      status: SettlementStatus.ELIGIBLE,
      calculation: {
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 5_000,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 5_000,
        restaurantPayableInPaise: 40_000,
      },
    });

    expect(
      txMock.settlement.create,
    ).not.toHaveBeenCalled();
  });

  it('should reject a settlement when a blocking issue exists', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-6',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 40_000,
      platformFeeInPaise: 4_000,
      paymentTransaction: {
        id: 'payment-6',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-6',
      status: SettlementStatus.PENDING,
      grossAmountInPaise: 40_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 4_000,
      restaurantPayableInPaise: 36_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-6',
      adjustmentWindowComplete: true,
      hasBlockingIssue: true,
    });

    expect(result.status).toBe(
      SettlementStatus.PENDING,
    );

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: SettlementStatus.PENDING,
        eligibleAt: null,
      }),
    });
  });
});