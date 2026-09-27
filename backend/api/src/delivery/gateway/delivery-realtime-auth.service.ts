import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryRealtimeAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async canJoinDelivery(
    deliveryId: string,
    userId: string,
    role: string,
  ): Promise<boolean> {
    const delivery = await this.prisma.delivery.findUnique({
      where: {
        id: deliveryId,
      },
      select: {
        id: true,
        riderId: true,
        order: {
          select: {
            customerId: true,
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (role === UserRole.CUSTOMER) {
      return delivery.order.customerId === userId;
    }

    if (role === UserRole.DELIVERY_PARTNER) {
      if (!delivery.riderId) {
        return false;
      }

      const rider = await this.prisma.rider.findUnique({
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
}