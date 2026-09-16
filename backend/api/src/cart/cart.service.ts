import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: {
        customerId: userId,
      },
      include: {
        items: {
          include: {
            foodItem: {
              include: {
                restaurant: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return {
        id: null,
        items: [],
        totalItems: 0,
        subtotalInPaise: 0,
      };
    }

    const items = cart.items.map((item) => ({
      id: item.id,
      foodItemId: item.foodItemId,
      quantity: item.quantity,
      foodItem: item.foodItem,
      itemTotalInPaise: item.quantity * item.foodItem.priceInPaise,
    }));

    const totalItems = items.reduce(
      (total, item) => total + item.quantity,
      0,
    );

    const subtotalInPaise = items.reduce(
      (total, item) => total + item.itemTotalInPaise,
      0,
    );

    return {
      id: cart.id,
      items,
      totalItems,
      subtotalInPaise,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

    async addCartItem(userId: string, dto: AddCartItemDto) {
    const foodItem = await this.prisma.foodItem.findUnique({
      where: {
        id: dto.foodItemId,
      },
    });

    if (!foodItem) {
      throw new NotFoundException('Food item not found');
    }

    if (!foodItem.isAvailable) {
      throw new BadRequestException('Food item is not available');
    }

    const cart = await this.prisma.cart.upsert({
      where: {
        customerId: userId,
      },
      create: {
        customerId: userId,
      },
      update: {},
    });

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_foodItemId: {
          cartId: cart.id,
          foodItemId: dto.foodItemId,
        },
      },
    });

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: {
          id: existingItem.id,
        },
        data: {
          quantity: existingItem.quantity + dto.quantity,
        },
        include: {
          foodItem: {
            include: {
              restaurant: true,
            },
          },
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        foodItemId: foodItem.id,
        quantity: dto.quantity,
      },
      include: {
        foodItem: {
          include: {
            restaurant: true,
          },
        },
      },
    });
  }
}