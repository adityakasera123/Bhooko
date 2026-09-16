import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';
import type { CreateFoodItemDto } from './dto/create-food-item.dto';
import type { UpdateFoodItemDto } from './dto/update-food-item.dto';
import type { UpdateFoodItemAvailabilityDto } from './dto/update-food-item-availability.dto';

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

    async createFoodItem(
    ownerId: string,
    restaurantId: string,
    data: CreateFoodItemDto,
  ) {
    await this.verifyRestaurantOwner(ownerId, restaurantId);

    const category = await this.prisma.foodCategory.findUnique({
      where: { id: data.categoryId },
      select: {
        id: true,
        restaurantId: true,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.restaurantId !== restaurantId) {
      throw new ForbiddenException(
        'Category does not belong to this restaurant',
      );
    }

    if (!category.isActive) {
      throw new ForbiddenException(
        'Cannot add food item to an inactive category',
      );
    }

    return this.prisma.foodItem.create({
      data: {
        restaurantId,
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        priceInPaise: data.priceInPaise,
        foodType: data.foodType,
      },
    });
  }

    async getFoodItems(restaurantId: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    return this.prisma.foodItem.findMany({
      where: {
        restaurantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayOrder: true,
            isActive: true,
          },
        },
      },
    });
  }

    async getFoodItem(id: string) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            displayOrder: true,
            isActive: true,
          },
        },
      },
    });

    if (!foodItem) {
      throw new NotFoundException('Food item not found');
    }

    return foodItem;
  }

    async updateFoodItem(
    ownerId: string,
    foodItemId: string,
    data: UpdateFoodItemDto,
  ) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id: foodItemId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!foodItem) {
      throw new NotFoundException('Food item not found');
    }

    await this.verifyRestaurantOwner(ownerId, foodItem.restaurantId);

    if (data.categoryId !== undefined) {
      const category = await this.prisma.foodCategory.findUnique({
        where: { id: data.categoryId },
        select: {
          id: true,
          restaurantId: true,
          isActive: true,
        },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (category.restaurantId !== foodItem.restaurantId) {
        throw new ForbiddenException(
          'Category does not belong to this restaurant',
        );
      }

      if (!category.isActive) {
        throw new ForbiddenException(
          'Cannot move food item to an inactive category',
        );
      }
    }

    return this.prisma.foodItem.update({
      where: { id: foodItemId },
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
        ...(data.priceInPaise !== undefined && {
          priceInPaise: data.priceInPaise,
        }),
        ...(data.categoryId !== undefined && {
          categoryId: data.categoryId,
        }),
        ...(data.foodType !== undefined && {
          foodType: data.foodType,
        }),
      },
    });
  }

    async deleteFoodItem(
    ownerId: string,
    foodItemId: string,
  ) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id: foodItemId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!foodItem) {
      throw new NotFoundException('Food item not found');
    }

    await this.verifyRestaurantOwner(ownerId, foodItem.restaurantId);

    return this.prisma.foodItem.delete({
      where: { id: foodItemId },
    });
  }

    async updateFoodItemAvailability(
    ownerId: string,
    foodItemId: string,
    data: UpdateFoodItemAvailabilityDto,
  ) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: { id: foodItemId },
      select: {
        id: true,
        restaurantId: true,
      },
    });

    if (!foodItem) {
      throw new NotFoundException('Food item not found');
    }

    await this.verifyRestaurantOwner(ownerId, foodItem.restaurantId);

    return this.prisma.foodItem.update({
      where: { id: foodItemId },
      data: {
        isAvailable: data.isAvailable,
      },
    });
  }

}