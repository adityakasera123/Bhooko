import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from '../pricing/pricing.service';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
  ) {}

  async preview(userId: string, addressId: string) {
    const address = await this.prisma.customerAddress.findFirst({
      where: {
        id: addressId,
        customerId: userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Delivery address not found');
    }

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

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const restaurantGroups = new Map<
      string,
      {
        restaurantId: string;
        restaurantName: string;
        items: Array<{
          foodItemId: string;
          foodItemName: string;
          unitPriceInPaise: number;
          quantity: number;
          itemSubtotalInPaise: number;
        }>;
        itemSubtotalInPaise: number;
      }
    >();

    for (const cartItem of cart.items) {
      const foodItem = cartItem.foodItem;

      if (!foodItem) {
        throw new NotFoundException('Food item not found');
      }

      if (!foodItem.restaurant) {
        throw new NotFoundException('Restaurant not found');
      }

      if (!foodItem.isAvailable) {
        throw new BadRequestException(
          `Food item "${foodItem.name}" is not available`,
        );
      }

      if (
        !Number.isInteger(cartItem.quantity) ||
        cartItem.quantity < 1 ||
        cartItem.quantity > 20
      ) {
        throw new BadRequestException(
          `Invalid quantity for food item "${foodItem.name}"`,
        );
      }

      const itemSubtotalInPaise =
        foodItem.priceInPaise * cartItem.quantity;

      const existingGroup = restaurantGroups.get(
        foodItem.restaurantId,
      );

      if (existingGroup) {
        existingGroup.items.push({
          foodItemId: foodItem.id,
          foodItemName: foodItem.name,
          unitPriceInPaise: foodItem.priceInPaise,
          quantity: cartItem.quantity,
          itemSubtotalInPaise,
        });

        existingGroup.itemSubtotalInPaise += itemSubtotalInPaise;
      } else {
        restaurantGroups.set(foodItem.restaurantId, {
          restaurantId: foodItem.restaurantId,
          restaurantName: foodItem.restaurant.name,
          items: [
            {
              foodItemId: foodItem.id,
              foodItemName: foodItem.name,
              unitPriceInPaise: foodItem.priceInPaise,
              quantity: cartItem.quantity,
              itemSubtotalInPaise,
            },
          ],
          itemSubtotalInPaise,
        });
      }
    }

    const restaurants = [...restaurantGroups.values()].map(
      (group) => {
        const pricing = this.pricingService.calculate({
          itemSubtotalInPaise: group.itemSubtotalInPaise,
        });

        return {
          restaurantId: group.restaurantId,
          restaurantName: group.restaurantName,
          items: group.items,
          ...pricing,
        };
      },
    );

    const grandTotalInPaise = restaurants.reduce(
      (total, restaurant) =>
        total + restaurant.totalInPaise,
      0,
    );

    return {
      address: {
        id: address.id,
        label: address.label,
        contactName: address.contactName,
        contactPhone: address.contactPhone,
        line1: address.line1,
        line2: address.line2,
        area: address.area,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        deliveryInstructions: address.deliveryInstructions,
      },
      restaurants,
      grandTotalInPaise,
      currency: 'INR',
    };
  }
}
