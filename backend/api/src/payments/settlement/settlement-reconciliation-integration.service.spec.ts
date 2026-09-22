import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SettlementCalculatorService } from './settlement-calculator.service';
import { SettlementEligibilityService } from './settlement-eligibility.service';
import { SettlementReconciliationService } from './settlement-reconciliation.service';
import { SettlementService } from './settlement.service';
import { SettlementStateMachineService } from './settlement-state-machine.service';

type MockSettlement = {
  id: string;
  restaurantPayableInPaise: number;
};

type FindUniqueMock = jest.MockedFunction<
  (
    args: {
      where: {
        id: string;
      };
    },
  ) => Promise<MockSettlement | null>
>;

describe('SettlementService - Reconciliation Integration', () => {
  let service: SettlementService;

  const findUniqueMock =
    jest.fn() as FindUniqueMock;

  const prismaMock = {
    settlement: {
      findUnique: findUniqueMock,
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new SettlementService(
      prismaMock,
      new SettlementCalculatorService(),
      new SettlementEligibilityService(),
      new SettlementStateMachineService(),
      new SettlementReconciliationService(),
    );
  });

  it('should reconcile when expected and recorded payable amounts match', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'settlement-1',
      restaurantPayableInPaise: 27_000,
    });

    const result =
      await service.reconcileSettlement(
        'settlement-1',
        27_000,
      );

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: {
        id: 'settlement-1',
      },
    });

    expect(result).toEqual({
      isReconciled: true,
      differenceInPaise: 0,
    });
  });

  it('should detect when recorded payable is lower than expected', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'settlement-1',
      restaurantPayableInPaise: 25_000,
    });

    const result =
      await service.reconcileSettlement(
        'settlement-1',
        27_000,
      );

    expect(result).toEqual({
      isReconciled: false,
      differenceInPaise: -2_000,
    });
  });

  it('should detect when recorded payable is higher than expected', async () => {
    findUniqueMock.mockResolvedValue({
      id: 'settlement-1',
      restaurantPayableInPaise: 29_000,
    });

    const result =
      await service.reconcileSettlement(
        'settlement-1',
        27_000,
      );

    expect(result).toEqual({
      isReconciled: false,
      differenceInPaise: 2_000,
    });
  });

  it('should throw when settlement does not exist', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(
      service.reconcileSettlement(
        'missing-settlement',
        27_000,
      ),
    ).rejects.toThrow(
      new NotFoundException(
        'Settlement not found',
      ),
    );
  });
});