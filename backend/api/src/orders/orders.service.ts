import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PricingService } from '../pricing/pricing.service';
import { OrderStateMachineService } from './order-state-machine.service';

@Injectable()
export class OrdersService {
  constructor(
  private readonly prisma: PrismaService,
  private readonly pricingService: PricingService,
  private readonly orderStateMachine: OrderStateMachineService,
) {}

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

      const pricing = this.pricingService.calculate({
  itemSubtotalInPaise,
});

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

          itemSubtotalInPaise: pricing.itemSubtotalInPaise,
deliveryFeeInPaise: pricing.deliveryFeeInPaise,
platformFeeInPaise: pricing.platformFeeInPaise,
taxInPaise: pricing.taxInPaise,
discountInPaise: pricing.discountInPaise,
totalInPaise: pricing.totalInPaise,

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

async getMyOrders(userId: string) {
  return this.prisma.order.findMany({
    where: {
      customerId: userId,
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getOrderById(userId: string, orderId: string) {
  const order = await this.prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: userId,
    },
    include: {
      items: true,
    },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  return order;
}

async updateOrderStatus(
  userId: string,
  role: string,
  orderId: string,
  dto: UpdateOrderStatusDto,
) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  if (role === 'CUSTOMER') {
    throw new ForbiddenException(
      'Customers are not allowed to update order status',
    );
  }

  if (role === 'RESTAURANT') {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: order.restaurantId },
    });

    if (!restaurant || restaurant.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to update this restaurant order',
      );
    }
  } else {
    throw new ForbiddenException(
      'You are not allowed to update order status',
    );
  }

  this.orderStateMachine.assertTransitionAllowed(
    order.status,
    dto.status,
  );

  return this.prisma.order.update({
    where: { id: orderId },
    data: {
      status: dto.status,
    },
  });
}

async cancelOrder(userId: string, orderId: string) {
  const order = await this.prisma.order.findFirst({
    where: {
      id: orderId,
      customerId: userId,
    },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  this.orderStateMachine.assertTransitionAllowed(
    order.status,
    'CANCELLED',
  );

  return this.prisma.order.update({
    where: {
      id: orderId,
    },
    data: {
      status: 'CANCELLED',
    },
  });
}

}