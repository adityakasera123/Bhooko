import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeliveryAssignmentStatus,
  DeliveryEventType,
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
  async acceptAssignment(assignmentId: string) {
    const assignment =
      await this.prisma.deliveryAssignment.findUnique({
        where: {
          id: assignmentId,
        },
        include: {
          delivery: {
            select: {
              id: true,
              status: true,
            },
          },
          rider: {
            select: {
              id: true,
              availability: true,
            },
          },
        },
      });

    if (!assignment) {
      throw new NotFoundException(
        'Delivery assignment not found',
      );
    }

    if (
      assignment.status !==
      DeliveryAssignmentStatus.PENDING
    ) {
      throw new ConflictException(
        'Only pending assignments can be accepted',
      );
    }

    if (
      assignment.delivery.status !==
      DeliveryStatus.ASSIGNED
    ) {
      throw new ConflictException(
        'Delivery is not available for acceptance',
      );
    }

    if (
      assignment.rider.availability !==
      RiderAvailability.ASSIGNED
    ) {
      throw new ConflictException(
        'Rider is not assigned to this delivery',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedAssignment =
        await tx.deliveryAssignment.update({
          where: {
            id: assignmentId,
          },
          data: {
            status: DeliveryAssignmentStatus.ACCEPTED,
            acceptedAt: new Date(),
          },
        });

      await tx.delivery.update({
        where: {
          id: assignment.deliveryId,
        },
        data: {
          status: DeliveryStatus.RIDER_ACCEPTED,
        },
      });

      await tx.rider.update({
        where: {
          id: assignment.riderId,
        },
        data: {
          availability: RiderAvailability.ON_DELIVERY,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: assignment.deliveryId,
          type: DeliveryEventType.ACCEPTED,
          metadata: {
            riderId: assignment.riderId,
            assignmentId: assignment.id,
          },
        },
      });

      return updatedAssignment;
    });
  }

  async arriveAtRestaurant(assignmentId: string) {
  const assignment =
    await this.prisma.deliveryAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        delivery: true,
        rider: true,
      },
    });

  if (!assignment) {
    throw new NotFoundException(
      'Delivery assignment not found',
    );
  }

  if (
    assignment.status !==
    DeliveryAssignmentStatus.ACCEPTED
  ) {
    throw new ConflictException(
      'Only accepted assignments can mark arrival',
    );
  }

  if (
    assignment.delivery.status !==
    DeliveryStatus.RIDER_ACCEPTED
  ) {
    throw new ConflictException(
      'Delivery is not ready for restaurant arrival',
    );
  }

  if (
    assignment.rider.availability !==
    RiderAvailability.ON_DELIVERY
  ) {
    throw new ConflictException(
      'Rider must be on delivery before arrival',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.update({
      where: {
        id: assignment.deliveryId,
      },
      data: {
        status:
          DeliveryStatus.ARRIVED_AT_RESTAURANT,
      },
    });

    await tx.deliveryEvent.create({
      data: {
        deliveryId: assignment.deliveryId,
        type: DeliveryEventType.ARRIVED,
        metadata: {
          riderId: assignment.riderId,
          assignmentId,
        },
      },
    });

    return delivery;
  });
  }
  async pickupDelivery(assignmentId: string) {
  const assignment =
    await this.prisma.deliveryAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        delivery: true,
        rider: true,
      },
    });

  if (!assignment) {
    throw new NotFoundException(
      'Delivery assignment not found',
    );
  }

  if (
    assignment.status !==
    DeliveryAssignmentStatus.ACCEPTED
  ) {
    throw new ConflictException(
      'Only accepted assignments can pick up delivery',
    );
  }

  if (
    assignment.delivery.status !==
    DeliveryStatus.ARRIVED_AT_RESTAURANT
  ) {
    throw new ConflictException(
      'Delivery is not ready for pickup',
    );
  }

  if (
    assignment.rider.availability !==
    RiderAvailability.ON_DELIVERY
  ) {
    throw new ConflictException(
      'Rider must be on delivery before pickup',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.update({
      where: {
        id: assignment.deliveryId,
      },
      data: {
        status: DeliveryStatus.PICKED_UP,
      },
    });

    await tx.deliveryEvent.create({
      data: {
        deliveryId: assignment.deliveryId,
        type: DeliveryEventType.PICKED_UP,
        metadata: {
          riderId: assignment.riderId,
          assignmentId,
        },
      },
    });

    return delivery;
  });
  }

  async outForDelivery(assignmentId: string) {
  const assignment =
    await this.prisma.deliveryAssignment.findUnique({
      where: {
        id: assignmentId,
      },
      include: {
        delivery: true,
        rider: true,
      },
    });

  if (!assignment) {
    throw new NotFoundException(
      'Delivery assignment not found',
    );
  }

  if (
    assignment.status !==
    DeliveryAssignmentStatus.ACCEPTED
  ) {
    throw new ConflictException(
      'Only accepted assignments can go out for delivery',
    );
  }

  if (
    assignment.delivery.status !==
    DeliveryStatus.PICKED_UP
  ) {
    throw new ConflictException(
      'Delivery is not ready to go out for delivery',
    );
  }

  if (
    assignment.rider.availability !==
    RiderAvailability.ON_DELIVERY
  ) {
    throw new ConflictException(
      'Rider must be on delivery before going out for delivery',
    );
  }

  return this.prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.update({
      where: {
        id: assignment.deliveryId,
      },
      data: {
        status: DeliveryStatus.OUT_FOR_DELIVERY,
      },
    });

    await tx.deliveryEvent.create({
      data: {
        deliveryId: assignment.deliveryId,
        type: DeliveryEventType.OUT_FOR_DELIVERY,
        metadata: {
          riderId: assignment.riderId,
          assignmentId,
        },
      },
    });

    return delivery;
  });
}
}