import { jest } from '@jest/globals';
import { SettlementStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SettlementCalculatorService } from './settlement-calculator.service';
import { SettlementEligibilityService } from './settlement-eligibility.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';
import { SettlementService } from './settlement.service';

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
  settlement: null;
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

describe('Settlement Refund & Adjustment Integration', () => {
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

  it('should include a processed refund in settlement calculation', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-refund-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-refund-1',
        status: 'PAID',
        refunds: [
          {
            id: 'refund-1',
            amountInPaise: 10_000,
            status: 'PROCESSED',
          },
        ],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-refund-1',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 10_000,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 35_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-refund-1',
      adjustmentWindowComplete: true,
    });

    expect(
      result.calculation.refundAmountInPaise,
    ).toBe(10_000);

    expect(
      result.calculation.restaurantPayableInPaise,
    ).toBe(35_000);
  });

  it('should ignore non-processed refunds', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-refund-2',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-refund-2',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-refund-2',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-refund-2',
      adjustmentWindowComplete: true,
    });

    expect(
      result.calculation.refundAmountInPaise,
    ).toBe(0);

    expect(
      result.calculation.restaurantPayableInPaise,
    ).toBe(45_000);
  });

  it('should aggregate multiple processed refunds', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-refund-3',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-refund-3',
        status: 'PAID',
        refunds: [
          {
            id: 'refund-1',
            amountInPaise: 5_000,
            status: 'PROCESSED',
          },
          {
            id: 'refund-2',
            amountInPaise: 7_000,
            status: 'PROCESSED',
          },
          {
            id: 'refund-3',
            amountInPaise: 3_000,
            status: 'PROCESSED',
          },
        ],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-refund-3',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 15_000,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 30_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-refund-3',
      adjustmentWindowComplete: true,
    });

    expect(
      result.calculation.refundAmountInPaise,
    ).toBe(15_000);

    expect(
      result.calculation.restaurantPayableInPaise,
    ).toBe(30_000);
  });

  it('should reduce restaurant payable by the adjustment amount', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-adjustment-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-adjustment-1',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-adjustment-1',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 5_000,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 40_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-adjustment-1',
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

  it('should combine refund and adjustment deductions', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-combined-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-combined-1',
        status: 'PAID',
        refunds: [
          {
            id: 'refund-combined-1',
            amountInPaise: 10_000,
            status: 'PROCESSED',
          },
        ],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-combined-1',
      status: SettlementStatus.ELIGIBLE,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 10_000,
      adjustmentAmountInPaise: 5_000,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 30_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-combined-1',
      adjustmentWindowComplete: true,
      adjustmentAmountInPaise: 5_000,
    });

    expect(result.calculation).toEqual({
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 10_000,
      adjustmentAmountInPaise: 5_000,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 30_000,
    });
  });

  it('should keep settlement pending when adjustment window is incomplete', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-window-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-window-1',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-window-1',
      status: SettlementStatus.PENDING,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-window-1',
      adjustmentWindowComplete: false,
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

  it('should keep settlement pending when a blocking issue exists', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-issue-1',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-issue-1',
        status: 'PAID',
        refunds: [],
      },
      settlement: null,
    });

    txMock.settlement.create.mockResolvedValue({
      id: 'settlement-issue-1',
      status: SettlementStatus.PENDING,
      grossAmountInPaise: 50_000,
      refundAmountInPaise: 0,
      adjustmentAmountInPaise: 0,
      platformFeeInPaise: 5_000,
      restaurantPayableInPaise: 45_000,
    });

    const result = await service.createSettlement({
      orderId: 'order-issue-1',
      adjustmentWindowComplete: true,
      hasBlockingIssue: true,
    });

    expect(result.status).toBe(
      SettlementStatus.PENDING,
    );
  });

  it('should reject an adjustment that makes payable negative', async () => {
    txMock.order.findUnique.mockResolvedValue({
      id: 'order-adjustment-2',
      restaurantId: 'restaurant-1',
      status: 'DELIVERED',
      totalInPaise: 50_000,
      platformFeeInPaise: 5_000,
      paymentTransaction: {
        id: 'payment-adjustment-2',
        status: 'PAID',
        refunds: [
          {
            id: 'refund-adjustment-2',
            amountInPaise: 30_000,
            status: 'PROCESSED',
          },
        ],
      },
      settlement: null,
    });

    await expect(
      service.createSettlement({
        orderId: 'order-adjustment-2',
        adjustmentWindowComplete: true,
        adjustmentAmountInPaise: 20_000,
      }),
    ).rejects.toThrow(
      'Restaurant payable amount cannot be negative',
    );

    expect(
      txMock.settlement.create,
    ).not.toHaveBeenCalled();
  });
});