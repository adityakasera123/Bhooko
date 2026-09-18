import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

async createOrder(userId: string, dto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    const address = await tx.customerAddress.findFirst({
      where: {
        id: dto.addressId,
        customerId: userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Delivery address not found');
    }

    const cart = await tx.cart.findUnique({
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
        restaurant: typeof cart.items[number]['foodItem']['restaurant'];
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

      if (foodItem.restaurantId !== foodItem.restaurant.id) {
        throw new BadRequestException(
          `Food item "${foodItem.name}" has an invalid restaurant relationship`,
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
          restaurant: foodItem.restaurant,
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

    const createdOrders = [];

    for (const group of restaurantGroups.values()) {
      const itemSubtotalInPaise = group.itemSubtotalInPaise;

      const order = await tx.order.create({
        data: {
          customerId: userId,
          restaurantId: group.restaurant.id,
          status: 'CREATED',

          restaurantName: group.restaurant.name,

          deliveryAddressLabel: address.label,
          deliveryContactName: address.contactName,
          deliveryContactPhone: address.contactPhone,
          deliveryAddressLine1: address.line1,
          deliveryAddressLine2: address.line2,
          deliveryAddressArea: address.area,
          deliveryAddressCity: address.city,
          deliveryAddressState: address.state,
          deliveryAddressPincode: address.pincode,
          deliveryLatitude: address.latitude,
          deliveryLongitude: address.longitude,
          deliveryInstructions: address.deliveryInstructions,

          itemSubtotalInPaise,
          deliveryFeeInPaise: 0,
          platformFeeInPaise: 0,
          taxInPaise: 0,
          discountInPaise: 0,
          totalInPaise: itemSubtotalInPaise,

          items: {
            create: group.items.map((item) => ({
              foodItemId: item.foodItemId,
              foodItemName: item.foodItemName,
              unitPriceInPaise: item.unitPriceInPaise,
              quantity: item.quantity,
              itemSubtotalInPaise: item.itemSubtotalInPaise,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      createdOrders.push(order);
    }

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return {
      message: 'Order created successfully',
      orderCount: createdOrders.length,
      orders: createdOrders,
    };
  });
}
}