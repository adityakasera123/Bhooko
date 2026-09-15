import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class FoodService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyRestaurantOwner(
    ownerId: string,
    restaurantId: string,
  ) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    if (restaurant.ownerId !== ownerId) {
      throw new ForbiddenException(
        'You are not allowed to manage this restaurant',
      );
    }

    return restaurant;
  }

  async createCategory(
    ownerId: string,
    restaurantId: string,
    data: CreateCategoryDto,
  ) {
    await this.verifyRestaurantOwner(ownerId, restaurantId);

    return this.prisma.foodCategory.create({
      data: {
        restaurantId,
        name: data.name,
        displayOrder: data.displayOrder,
      },
    });
  }

  async getCategories(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.foodCategory.findMany({
      where: { restaurantId },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async updateCategory(
    ownerId: string,
    categoryId: string,
    data: UpdateCategoryDto,
  ) {
    const category = await this.prisma.foodCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.verifyRestaurantOwner(ownerId, category.restaurantId);

    return this.prisma.foodCategory.update({
      where: { id: categoryId },
      data: {
        ...(data.name !== undefined && {
          name: data.name,
        }),
        ...(data.displayOrder !== undefined && {
          displayOrder: data.displayOrder,
        }),
        ...(data.isActive !== undefined && {
          isActive: data.isActive,
        }),
      },
    });
  }

  async deleteCategory(
    ownerId: string,
    categoryId: string,
  ) {
    const category = await this.prisma.foodCategory.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.verifyRestaurantOwner(ownerId, category.restaurantId);

    return this.prisma.foodCategory.delete({
      where: { id: categoryId },
    });
  }
}