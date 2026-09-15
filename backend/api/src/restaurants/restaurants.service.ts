import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRestaurantDto } from './dto/create-restaurant.dto';
import type { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import type { UpdateRestaurantStatusDto } from './dto/update-restaurant-status.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRestaurant(
    ownerId: string,
    data: CreateRestaurantDto,
  ) {
    return this.prisma.restaurant.create({
      data: {
        ownerId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        latitude: data.latitude,
        longitude: data.longitude,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        area: data.area,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        status: 'CLOSED',
      },
    });
  }

  async getRestaurants() {
  const restaurants = await this.prisma.restaurant.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      latitude: true,
      longitude: true,
      addressLine1: true,
      addressLine2: true,
      area: true,
      city: true,
      state: true,
      pincode: true,
      status: true,
      rating: true,
      reviewCount: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const statusPriority = {
    OPEN: 0,
    PAUSED: 1,
    CLOSED: 2,
  } as const;

  return restaurants.sort(
    (a, b) =>
      statusPriority[a.status] - statusPriority[b.status],
  );
}

async getRestaurant(id: string) {
  const restaurant = await this.prisma.restaurant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      latitude: true,
      longitude: true,
      addressLine1: true,
      addressLine2: true,
      area: true,
      city: true,
      state: true,
      pincode: true,
      status: true,
      rating: true,
      reviewCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  return restaurant;
}

async updateRestaurant(
  ownerId: string,
  restaurantId: string,
  data: UpdateRestaurantDto,
) {
  const restaurant = await this.prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  if (restaurant.ownerId !== ownerId) {
    throw new ForbiddenException(
      'You are not allowed to update this restaurant',
    );
  }

  return this.prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),
      ...(data.description !== undefined && {
        description: data.description,
      }),
      ...(data.imageUrl !== undefined && {
        imageUrl: data.imageUrl,
      }),
      ...(data.latitude !== undefined && {
        latitude: data.latitude,
      }),
      ...(data.longitude !== undefined && {
        longitude: data.longitude,
      }),
      ...(data.addressLine1 !== undefined && {
        addressLine1: data.addressLine1,
      }),
      ...(data.addressLine2 !== undefined && {
        addressLine2: data.addressLine2,
      }),
      ...(data.area !== undefined && {
        area: data.area,
      }),
      ...(data.city !== undefined && {
        city: data.city,
      }),
      ...(data.state !== undefined && {
        state: data.state,
      }),
      ...(data.pincode !== undefined && {
        pincode: data.pincode,
      }),
    },
  });
}

async updateRestaurantStatus(
  ownerId: string,
  restaurantId: string,
  data: UpdateRestaurantStatusDto,
) {
  const restaurant = await this.prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (!restaurant) {
    throw new NotFoundException('Restaurant not found');
  }

  if (restaurant.ownerId !== ownerId) {
    throw new ForbiddenException(
      'You are not allowed to update this restaurant',
    );
  }

  return this.prisma.restaurant.update({
    where: { id: restaurantId },
    data: {
      status: data.status,
    },
  });
}

}