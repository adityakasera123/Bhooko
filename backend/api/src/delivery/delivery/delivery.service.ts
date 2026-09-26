import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, DeliveryEventType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  async createDelivery(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        delivery: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.delivery) {
      throw new ConflictException(
        'Delivery already exists for this order',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.create({
        data: {
          orderId: order.id,
          status: DeliveryStatus.CREATED,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          type: DeliveryEventType.CREATED,
        },
      });

      return delivery;
    });
  }
}