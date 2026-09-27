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

 async getCustomerTracking(
  deliveryId: string,
  customerId: string,
) {
  const delivery = await this.prisma.delivery.findUnique({
    where: {
      id: deliveryId,
    },
    include: {
      order: {
        select: {
          id: true,
          customerId: true,
          deliveryAddressLabel: true,
          deliveryContactName: true,
          deliveryContactPhone: true,
          deliveryAddressLine1: true,
          deliveryAddressLine2: true,
          deliveryAddressArea: true,
          deliveryAddressCity: true,
          deliveryAddressState: true,
          deliveryAddressPincode: true,
          deliveryLatitude: true,
          deliveryLongitude: true,
          deliveryInstructions: true,
        },
      },
      rider: {
        select: {
          id: true,
          vehicleType: true,
          vehicleNumber: true,
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  if (!delivery) {
    throw new NotFoundException('Delivery not found');
  }

  if (delivery.order.customerId !== customerId) {
    throw new ConflictException(
      'You are not authorized to access this delivery',
    );
  }

  return {
    deliveryId: delivery.id,
    orderId: delivery.order.id,
    status: delivery.status,

    rider: delivery.rider
      ? {
          id: delivery.rider.id,
          name: delivery.rider.user.name,
          phone: delivery.rider.user.phone,
          vehicleType: delivery.rider.vehicleType,
          vehicleNumber: delivery.rider.vehicleNumber,
        }
      : null,

    deliveryAddress: {
      label: delivery.order.deliveryAddressLabel,
      contactName: delivery.order.deliveryContactName,
      contactPhone: delivery.order.deliveryContactPhone,
      addressLine1: delivery.order.deliveryAddressLine1,
      addressLine2: delivery.order.deliveryAddressLine2,
      area: delivery.order.deliveryAddressArea,
      city: delivery.order.deliveryAddressCity,
      state: delivery.order.deliveryAddressState,
      pincode: delivery.order.deliveryAddressPincode,
      latitude: delivery.order.deliveryLatitude,
      longitude: delivery.order.deliveryLongitude,
      instructions: delivery.order.deliveryInstructions,
    },

    timestamps: {
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    },
  };
}
}