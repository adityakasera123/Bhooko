import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeliveryStatus, DeliveryEventType } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { DeliveryRealtimeService } from '../gateway/delivery-realtime.service';
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deliveryRealtime: DeliveryRealtimeService,
  ) {}

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

  async updateRiderLocation(
    deliveryId: string,
    userId: string,
    dto: UpdateDeliveryLocationDto,
  ) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!rider) {
      throw new ForbiddenException('Only an assigned rider can update location');
    }

    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: {
        id: true,
        riderId: true,
        status: true,
        riderLocationRecordedAt: true,
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (delivery.riderId !== rider.id) {
      throw new ForbiddenException(
        'You are not the assigned rider for this delivery',
      );
    }

    const activeStatuses: DeliveryStatus[] = [
      DeliveryStatus.ASSIGNED,
      DeliveryStatus.RIDER_ACCEPTED,
      DeliveryStatus.ARRIVED_AT_RESTAURANT,
      DeliveryStatus.PICKED_UP,
      DeliveryStatus.OUT_FOR_DELIVERY,
    ];

    if (!activeStatuses.includes(delivery.status)) {
      throw new ConflictException(
        'Location updates are not allowed for this delivery status',
      );
    }

    const recordedAt = new Date(dto.recordedAt);
    const now = new Date();
    const futureToleranceMs = 60_000;
    const maxAgeMs = 5 * 60_000;

    if (recordedAt.getTime() > now.getTime() + futureToleranceMs) {
      throw new BadRequestException(
        'Location timestamp cannot be more than 60 seconds in the future',
      );
    }

    if (recordedAt.getTime() < now.getTime() - maxAgeMs) {
      throw new BadRequestException(
        'Location timestamp is too old; submit a fresh GPS reading',
      );
    }

    if (
      delivery.riderLocationRecordedAt &&
      recordedAt.getTime() <= delivery.riderLocationRecordedAt.getTime()
    ) {
      throw new ConflictException(
        'Out-of-order location update rejected',
      );
    }

    const receivedAt = new Date();

    // The conditional update prevents a concurrent older reading from
    // overwriting a newer accepted reading.
    const updated = await this.prisma.delivery.updateMany({
      where: {
        id: deliveryId,
        riderId: rider.id,
        status: { in: activeStatuses },
        OR: [
          { riderLocationRecordedAt: null },
          { riderLocationRecordedAt: { lt: recordedAt } },
        ],
      },
      data: {
        riderLatitude: dto.latitude,
        riderLongitude: dto.longitude,
        riderLocationAccuracyMeters: dto.accuracyMeters ?? null,
        riderLocationRecordedAt: recordedAt,
        riderLocationReceivedAt: receivedAt,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Location update was superseded or delivery is no longer active',
      );
    }

    const location = {
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyMeters: dto.accuracyMeters ?? null,
      recordedAt: recordedAt.toISOString(),
      receivedAt: receivedAt.toISOString(),
    };

    // Emit only after the database confirms the update was accepted.
    this.deliveryRealtime.emitToDelivery(deliveryId, {
      event: 'delivery:locationUpdated',
      timestamp: receivedAt.toISOString(),
      data: { location },
    });

    return {
      deliveryId,
      location,
    };
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

  const hasRiderLocation =
    delivery.riderLatitude != null &&
    delivery.riderLongitude != null &&
    delivery.riderLocationRecordedAt != null &&
    delivery.riderLocationReceivedAt != null;

  const riderLocation = hasRiderLocation
    ? {
        latitude: delivery.riderLatitude,
        longitude: delivery.riderLongitude,
        accuracyMeters: delivery.riderLocationAccuracyMeters,
        recordedAt: delivery.riderLocationRecordedAt!.toISOString(),
        receivedAt: delivery.riderLocationReceivedAt!.toISOString(),
        isStale:
          Date.now() - delivery.riderLocationReceivedAt!.getTime() >
          60_000,
      }
    : null;

  return {
    deliveryId: delivery.id,
    orderId: delivery.order.id,
    status: delivery.status,
    riderLocation,

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