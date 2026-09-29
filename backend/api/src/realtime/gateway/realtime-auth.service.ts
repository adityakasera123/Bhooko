import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RealtimeAuthService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async canJoinOrder(
    orderId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        customerId: true,
        restaurantId: true,
      },
    });

    if (!order) {
      return false;
    }

    if (role === UserRole.CUSTOMER) {
      return order.customerId === userId;
    }

    if (role === UserRole.RESTAURANT) {
      return order.restaurantId === userId;
    }

    return false;
  }

  async canJoinDelivery(
    deliveryId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const delivery =
      await this.prisma.delivery.findUnique({
        where: {
          id: deliveryId,
        },
        select: {
          riderId: true,
          order: {
            select: {
              customerId: true,
              restaurantId: true,
            },
          },
        },
      });

    if (!delivery) {
      return false;
    }

    if (role === UserRole.CUSTOMER) {
      return (
        delivery.order.customerId === userId
      );
    }

    if (role === UserRole.RESTAURANT) {
      return (
        delivery.order.restaurantId === userId
      );
    }

    if (role === UserRole.DELIVERY_PARTNER) {
      if (!delivery.riderId) {
        return false;
      }

      const rider =
        await this.prisma.rider.findUnique({
          where: {
            id: delivery.riderId,
          },
          select: {
            userId: true,
          },
        });

      return rider?.userId === userId;
    }

    return false;
  }

  async canJoinRestaurant(
    restaurantId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    if (role !== UserRole.RESTAURANT) {
      return false;
    }

    const restaurant =
      await this.prisma.restaurant.findUnique({
        where: {
          id: restaurantId,
        },
        select: {
          ownerId: true,
        },
      });

    if (!restaurant) {
      return false;
    }

    return restaurant.ownerId === userId;
  }

  async canJoinRider(
    riderId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    if (role !== UserRole.DELIVERY_PARTNER) {
      return false;
    }

    const rider =
      await this.prisma.rider.findUnique({
        where: {
          id: riderId,
        },
        select: {
          userId: true,
        },
      });

    if (!rider) {
      return false;
    }

    return rider.userId === userId;
  }

  async canJoinCustomer(
    customerId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    if (role !== UserRole.CUSTOMER) {
      return false;
    }

    return customerId === userId;
  }
}