import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryAssignmentStatus,
  DeliveryStatus,
  RiderAvailability,
  RiderStatus,
} from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AssignmentService {
  constructor(private readonly prisma: PrismaService) {}

  async assignRider(
    deliveryId: string,
    riderId: string,
  ) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: {
        rider: true,
        assignments: {
          where: {
            status: {
              in: [
                DeliveryAssignmentStatus.PENDING,
                DeliveryAssignmentStatus.ACCEPTED,
              ],
            },
          },
        },
      },
    });

    if (!delivery) {
      throw new NotFoundException('Delivery not found');
    }

    if (
      delivery.status !== DeliveryStatus.CREATED
    ) {
      throw new ConflictException(
        'Delivery is not available for assignment',
      );
    }

    if (delivery.riderId) {
      throw new ConflictException(
        'Delivery already has a rider assigned',
      );
    }

    if (delivery.assignments.length > 0) {
      throw new ConflictException(
        'Delivery already has an active assignment',
      );
    }

    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    if (rider.status !== RiderStatus.ACTIVE) {
      throw new ConflictException(
        'Rider must be active before assignment',
      );
    }

    if (rider.availability !== RiderAvailability.ONLINE) {
      throw new ConflictException(
        'Rider must be online before assignment',
      );
    }

    const activeDelivery = await this.prisma.delivery.findFirst({
      where: {
        riderId,
        status: {
          notIn: [
            DeliveryStatus.DELIVERED,
            DeliveryStatus.FAILED,
            DeliveryStatus.CANCELLED,
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (activeDelivery) {
      throw new ConflictException(
        'Rider already has an active delivery',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const assignment = await tx.deliveryAssignment.create({
        data: {
          deliveryId,
          riderId,
          status: DeliveryAssignmentStatus.PENDING,
        },
      });

      await tx.delivery.update({
        where: { id: deliveryId },
        data: {
          riderId,
        },
      });

      await tx.rider.update({
        where: { id: riderId },
        data: {
          availability: RiderAvailability.ASSIGNED,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId,
          type: 'ASSIGNED',
          metadata: {
            riderId,
            assignmentId: assignment.id,
          },
        },
      });

      return assignment;
    });
  }
}