import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RiderAvailability,
  RiderStatus,
  UserRole,
} from '@prisma/client';

@Injectable()
export class RiderService {
  constructor(private readonly prisma: PrismaService) {}

  async createRider(userId: string, vehicleType?: string, vehicleNumber?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        rider: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.DELIVERY_PARTNER) {
      throw new ConflictException(
        'User must have DELIVERY_PARTNER role',
      );
    }

    if (user.rider) {
      throw new ConflictException('Rider profile already exists');
    }

    return this.prisma.rider.create({
      data: {
        userId,
        status: RiderStatus.REGISTERED,
        availability: RiderAvailability.OFFLINE,
        vehicleType,
        vehicleNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }

  async getRiderByUserId(userId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        deliveries: {
          where: {
            status: {
              notIn: ['DELIVERED', 'FAILED', 'CANCELLED'],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider profile not found');
    }

    return rider;
  }

  async getRiderById(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }

    return rider;
  }

  async activateRider(riderId: string) {
    const rider = await this.getRiderById(riderId);

    if (rider.status === RiderStatus.ACTIVE) {
      return rider;
    }

    return this.prisma.rider.update({
      where: { id: riderId },
      data: {
        status: RiderStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }

  async deactivateRider(riderId: string) {
    const rider = await this.getRiderById(riderId);

    if (rider.availability !== RiderAvailability.OFFLINE) {
      throw new ConflictException(
        'Rider must be offline before deactivation',
      );
    }

    if (rider.status === RiderStatus.INACTIVE) {
      return rider;
    }

    return this.prisma.rider.update({
      where: { id: riderId },
      data: {
        status: RiderStatus.INACTIVE,
        availability: RiderAvailability.OFFLINE,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
    });
  }

  async setAvailability(
    riderId: string,
    availability: RiderAvailability,
  ) {
    const rider = await this.getRiderById(riderId);

    if (rider.status !== RiderStatus.ACTIVE) {
      throw new ConflictException(
        'Only active riders can change availability',
      );
    }

    if (
      availability === RiderAvailability.ONLINE &&
      rider.availability !== RiderAvailability.OFFLINE &&
      rider.availability !== RiderAvailability.ONLINE
    ) {
      throw new ConflictException(
        'Rider cannot go online while assigned or on delivery',
      );
    }

    if (
      availability === RiderAvailability.OFFLINE &&
      (rider.availability === RiderAvailability.ASSIGNED ||
        rider.availability === RiderAvailability.ON_DELIVERY)
    ) {
      throw new ConflictException(
        'Rider cannot go offline during an active delivery',
      );
    }

    return this.prisma.rider.update({
      where: { id: riderId },
      data: {
        availability,
      },
    });
  }

  async updateVehicle(
    riderId: string,
    vehicleType?: string,
    vehicleNumber?: string,
  ) {
    await this.getRiderById(riderId);

    return this.prisma.rider.update({
      where: { id: riderId },
      data: {
        ...(vehicleType !== undefined && { vehicleType }),
        ...(vehicleNumber !== undefined && { vehicleNumber }),
      },
    });
  }
}