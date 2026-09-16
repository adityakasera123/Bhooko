import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}