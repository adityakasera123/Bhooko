import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private validateCoordinates(
    latitude: number,
    longitude: number,
    locationName: string,
  ): void {
    const validLatitude =
      Number.isFinite(latitude) &&
      latitude >= -90 &&
      latitude <= 90;

    const validLongitude =
      Number.isFinite(longitude) &&
      longitude >= -180 &&
      longitude <= 180;

    if (!validLatitude || !validLongitude) {
      throw new BadRequestException(
        `Invalid ${locationName} location`,
      );
    }
  }

  private calculateDistanceKm(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ): number {
    const earthRadiusKm = 6371;

    const latitudeDifference = this.toRadians(
      latitude2 - latitude1,
    );

    const longitudeDifference = this.toRadians(
      longitude2 - longitude1,
    );

    const a =
      Math.sin(latitudeDifference / 2) ** 2 +
      Math.cos(this.toRadians(latitude1)) *
        Math.cos(this.toRadians(latitude2)) *
        Math.sin(longitudeDifference / 2) ** 2;

    const c =
      2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusKm * c;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  async getServiceabilityData(
    customerId: string,
    addressId: string,
    restaurantId: string,
  ) {
    const address =
      await this.prisma.customerAddress.findFirst({
        where: {
          id: addressId,
          customerId,
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
        },
      });

    if (!address) {
      throw new NotFoundException(
        'Customer address not found',
      );
    }

    this.validateCoordinates(
      address.latitude,
      address.longitude,
      'customer',
    );

    const restaurant =
      await this.prisma.restaurant.findUnique({
        where: {
          id: restaurantId,
        },
        select: {
          id: true,
          latitude: true,
          longitude: true,
          deliveryRadiusKm: true,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found',
      );
    }

    this.validateCoordinates(
      restaurant.latitude,
      restaurant.longitude,
      'restaurant',
    );

    const distanceKm = this.calculateDistanceKm(
      address.latitude,
      address.longitude,
      restaurant.latitude,
      restaurant.longitude,
    );

    const serviceable =
      distanceKm <= restaurant.deliveryRadiusKm;

    return {
      serviceable,
      restaurantId: restaurant.id,
      distanceKm: Number(distanceKm.toFixed(2)),
      deliveryRadiusKm: restaurant.deliveryRadiusKm,
      reason: serviceable
        ? null
        : 'OUTSIDE_SERVICE_AREA',
    };
  }
}