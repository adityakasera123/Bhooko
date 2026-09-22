import { jest } from '@jest/globals';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettlementCalculatorService } from './settlement-calculator.service';
import { SettlementEligibilityService } from './settlement-eligibility.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';
import { SettlementService } from './settlement.service';
import { SettlementReconciliationService } from './settlement-reconciliation.service';

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

describe('Settlement Idempotency & Concurrency', () => {
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
  new SettlementReconciliationService(),
);
  });

  it('should not create a duplicate when settlement already exists', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-idempotent-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-1',
        status: 'PAID',
        refunds: [],
      },
      settlement: {
        id: 'settlement-existing',
        status: SettlementStatus.ELIGIBLE,
        grossAmountInPaise: 50_000,
        refundAmountInPaise: 0,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 5_000,
        restaurantPayableInPaise: 45_000,
      },
    });

    const result = await service.createSettlement({
      orderId: 'order-idempotent-1',
      adjustmentWindowComplete: true,
    });

    expect(result.settlementId).toBe(
      'settlement-existing',
    );

    expect(result.status).toBe(
      SettlementStatus.ELIGIBLE,
    );

    expect(
      txMock.settlement.create,
    ).not.toHaveBeenCalled();
  });

  it('should return the same settlement data on repeated calls', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-idempotent-2',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 40_000,
      platformFeeInPaise: 4_000,
      paymentTransaction: {
        id: 'payment-2',
        status: 'PAID',
        refunds: [],
      },
      settlement: {
        id: 'settlement-existing-2',
        status: SettlementStatus.ELIGIBLE,
        grossAmountInPaise: 40_000,
        refundAmountInPaise: 0,
        adjustmentAmountInPaise: 0,
        platformFeeInPaise: 4_000,
        restaurantPayableInPaise: 36_000,
      },
    });

    const firstResult =
      await service.createSettlement({
        orderId: 'order-idempotent-2',
        adjustmentWindowComplete: true,
      });

    const secondResult =
      await service.createSettlement({
        orderId: 'order-idempotent-2',
        adjustmentWindowComplete: true,
      });

    expect(secondResult).toEqual(firstResult);

    expect(
      txMock.settlement.create,
    ).not.toHaveBeenCalled();
  });

  it('should create only one settlement when duplicate creation is attempted sequentially', async () => {
    const existingSettlement = {
      id: 'settlement-sequential',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    };

    txMock.order.findUnique
      .mockResolvedValueOnce({
        id: 'order-sequential',
        restaurantId: 'restaurant-1',
        status: 'DELIVERED',
        totalInPaise: 50_000,
        platformFeeInPaise: 5_000,
        paymentTransaction: {
          id: 'payment-sequential',
          status: 'PAID',
          refunds: [],
        },
        settlement: null,
      })
      .mockResolvedValueOnce({
        id: 'order-sequential',
        restaurantId: 'restaurant-1',
        status: 'DELIVERED',
        totalInPaise: 50_000,
        platformFeeInPaise: 5_000,
        paymentTransaction: {
          id: 'payment-sequential',
          status: 'PAID',
          refunds: [],
        },
        settlement: existingSettlement,
      });

    txMock.settlement.create.mockResolvedValue(
      existingSettlement,
    );

    const firstResult =
      await service.createSettlement({
        orderId: 'order-sequential',
        adjustmentWindowComplete: true,
      });

    const secondResult =
      await service.createSettlement({
        orderId: 'order-sequential',
        adjustmentWindowComplete: true,
      });

    expect(firstResult.settlementId).toBe(
      'settlement-sequential',
    );

    expect(secondResult.settlementId).toBe(
      'settlement-sequential',
    );

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledTimes(1);
  });

  it('should use the database unique order constraint as the final duplicate protection', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-race',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-race',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockRejectedValue(
      new Error(
        'Unique constraint failed on the fields: (`orderId`)',
      ),
    );

    await expect(
      service.createSettlement({
        orderId: 'order-race',
        adjustmentWindowComplete: true,
      }),
    ).rejects.toThrow(
      'Unique constraint failed on the fields: (`orderId`)',
    );

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledTimes(1);
  });

  it('should not create a settlement when the order is not eligible', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-not-eligible',
      restaurantId: 'restaurant-1',
      status: 'PREPARING',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-not-eligible',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-pending',
      status: SettlementStatus.PENDING,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    });

    const result =
      await service.createSettlement({
        orderId: 'order-not-eligible',
        adjustmentWindowComplete: true,
      });

    expect(result.status).toBe(
      SettlementStatus.PENDING,
    );

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledTimes(1);
  });

  it('should keep database transaction boundary around settlement creation', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-transaction',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 30_000,
      platformFeeInPaise: 3_000,
      paymentTransaction: {
        id: 'payment-transaction',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-transaction',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 30_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 3_000,
      restaurantPayableInPaise: 27_000,
    });

    await service.createSettlement({
      orderId: 'order-transaction',
      adjustmentWindowComplete: true,
    });

    expect(
      transactionMock,
    ).toHaveBeenCalledTimes(1);

    expect(
      txMock.order.findUnique,
    ).toHaveBeenCalledTimes(1);

    expect(
      txMock.settlement.create,
    ).toHaveBeenCalledTimes(1);
  });
});