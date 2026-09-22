import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderStateMachineService {
  private readonly allowedTransitions: Record<
    OrderStatus,
    OrderStatus[]
  > = {
    [OrderStatus.CREATED]: [
      OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED,
    ],

    [OrderStatus.CONFIRMED]: [
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ],

    [OrderStatus.PREPARING]: [
      OrderStatus.READY,
    ],

    [OrderStatus.READY]: [
      OrderStatus.OUT_FOR_DELIVERY,
    ],

    [OrderStatus.OUT_FOR_DELIVERY]: [
      OrderStatus.DELIVERED,
    ],

    [OrderStatus.DELIVERED]: [],

    [OrderStatus.CANCELLED]: [],
  };

  canTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): boolean {
    return this.allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
  }

  assertTransitionAllowed(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ): void {
    if (!this.canTransition(currentStatus, nextStatus)) {
      throw new ForbiddenException(
        `Order cannot move from ${currentStatus} to ${nextStatus}`,
      );
    }
  }
}