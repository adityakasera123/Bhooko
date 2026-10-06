import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  RestaurantOrderQueryDto,
  RestaurantOrderView,
} from './dto/restaurant-order-query.dto';
import { PricingService } from '../pricing/pricing.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { PaymentsService } from '../payments/payments.service';
import { DeliveryService } from '../delivery/delivery/delivery.service';
import { RealtimeService } from '../realtime/services/realtime.service';

import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class OrdersService {
constructor(
  private readonly prisma: PrismaService,
  private readonly pricingService: PricingService,
  private readonly orderStateMachine: OrderStateMachineService,
  private readonly paymentsService: PaymentsService,
  private readonly deliveryService: DeliveryService,
  private readonly realtimeService: RealtimeService,
  private readonly notificationsService: NotificationsService,
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

    const createdOrders: Array<
      Prisma.OrderGetPayload<{
        include: {
          items: true;
          restaurant: {
            select: {
              ownerId: true;
            };
          };
        };
      }>
    > = [];

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
          restaurant: {
            select: {
              ownerId: true,
            },
          },
        },
      });

      createdOrders.push(order);
    }

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    for (const order of createdOrders) {
      this.realtimeService.emitRestaurantOrderReceived(
        order.restaurantId,
        {
          orderId: order.id,
          customerId: userId,
          status: order.status,
        },
      );

      this.realtimeService.emitCustomerOrderUpdated(
        userId,
        {
          orderId: order.id,
          restaurantId: order.restaurantId,
          status: order.status,
        },
      );

      // Customer notification
      await this.notificationsService.create({
        recipientUserId: userId,
        type: NotificationType.ORDER_PLACED,
        title: 'Order Placed',
        message: `Your order from ${order.restaurantName} has been placed successfully.`,
        relatedEntityType: 'ORDER',
        relatedEntityId: order.id,
      });

      // Restaurant owner notification
      await this.notificationsService.create({
        recipientUserId: order.restaurant.ownerId,
        type: NotificationType.ORDER_PLACED,
        title: 'New Order Received',
        message: 'You have received a new order from a customer.',
        relatedEntityType: 'ORDER',
        relatedEntityId: order.id,
      });
    }

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

async getRestaurantOrders(
  userId: string,
  dto: RestaurantOrderQueryDto,
) {
  const restaurants =
    await this.prisma.restaurant.findMany({
      where: {
        ownerId: userId,
      },
      select: {
        id: true,
      },
    });

  const restaurantIds = restaurants.map(
    (restaurant) => restaurant.id,
  );

  if (restaurantIds.length === 0) {
    return [];
  }

  const where: {
    restaurantId: { in: string[] };
    status?: OrderStatus | { in: OrderStatus[] };
  } = {
    restaurantId: {
      in: restaurantIds,
    },
  };

  if (dto.status) {
    where.status = dto.status;
  } else if (
    dto.view === RestaurantOrderView.ACTIVE
  ) {
    where.status = {
      in: [
        OrderStatus.CREATED,
        OrderStatus.CONFIRMED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.OUT_FOR_DELIVERY,
      ],
    };
  } else if (
    dto.view === RestaurantOrderView.COMPLETED
  ) {
    where.status = {
      in: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ],
    };
  }

  return this.prisma.order.findMany({
    where,
    include: {
      items: true,
      paymentTransaction: {
        select: {
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

async getRestaurantOrderById(
  userId: string,
  orderId: string,
) {
  const order = await this.prisma.order.findUnique({
    where: {
      id: orderId,
    },
    include: {
      items: true,
      paymentTransaction: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  const restaurant =
    await this.prisma.restaurant.findUnique({
      where: {
        id: order.restaurantId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

  if (!restaurant || restaurant.ownerId !== userId) {
    throw new ForbiddenException(
      'You are not allowed to view this restaurant order',
    );
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

    const restaurantAllowedNextStatuses = [
  'CONFIRMED',
  'PREPARING',
  'READY',
];

if (!restaurantAllowedNextStatuses.includes(dto.status)) {
  throw new ForbiddenException(
    `Restaurant cannot move order to ${dto.status}`,
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

const updatedOrder = await this.prisma.order.update({
  where: { id: orderId },
  data: {
    status: dto.status,
  },
});

if (dto.status === OrderStatus.READY) {
  await this.deliveryService.createDelivery(orderId);

  await this.notificationsService.create({
    recipientUserId: updatedOrder.customerId,
    type: NotificationType.ORDER_READY,
    title: 'Order Ready',
    message: 'Your order is ready and will be handed over for delivery.',
    relatedEntityType: 'ORDER',
    relatedEntityId: updatedOrder.id,
  });
}

this.realtimeService.emitOrderStatusChanged(
  updatedOrder.id,
  updatedOrder.status,
  {
    orderId: updatedOrder.id,
    restaurantId: updatedOrder.restaurantId,
    customerId: updatedOrder.customerId,
  },
);

this.realtimeService.emitRestaurantOrderUpdated(
  updatedOrder.restaurantId,
  {
    orderId: updatedOrder.id,
    status: updatedOrder.status,
  },
);

this.realtimeService.emitCustomerOrderUpdated(
  updatedOrder.customerId,
  {
    orderId: updatedOrder.id,
    status: updatedOrder.status,
  },
);

return updatedOrder;
}

async acceptOrder(userId: string, orderId: string) {
  const order = await this.prisma.order.findUnique({
    where: {
      id: orderId,
    },
  });

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  const restaurant = await this.prisma.restaurant.findUnique({
    where: {
      id: order.restaurantId,
    },
  });

  if (!restaurant || restaurant.ownerId !== userId) {
    throw new ForbiddenException(
      'You are not allowed to accept this restaurant order',
    );
  }

  this.orderStateMachine.assertTransitionAllowed(
    order.status,
    'CONFIRMED',
  );

  const updatedOrder = await this.prisma.order.update({
  where: {
    id: orderId,
  },
  data: {
    status: 'CONFIRMED',
  },
});

this.realtimeService.emitOrderStatusChanged(
  updatedOrder.id,
  updatedOrder.status,
  {
    orderId: updatedOrder.id,
    restaurantId: updatedOrder.restaurantId,
    customerId: updatedOrder.customerId,
  },
);

this.realtimeService.emitRestaurantOrderUpdated(
  updatedOrder.restaurantId,
  {
    orderId: updatedOrder.id,
    status: updatedOrder.status,
  },
);

this.realtimeService.emitCustomerOrderUpdated(
  updatedOrder.customerId,
  {
    orderId: updatedOrder.id,
    restaurantId: updatedOrder.restaurantId,
    status: updatedOrder.status,
  },
);

await this.notificationsService.create({
  recipientUserId: updatedOrder.customerId,
  type: NotificationType.ORDER_CONFIRMED,
  title: 'Order Confirmed',
  message: 'Your BHOOKO order has been confirmed by the restaurant.',
  relatedEntityType: 'ORDER',
  relatedEntityId: updatedOrder.id,
});

return updatedOrder;
}

async rejectOrder(userId: string, orderId: string) {
  const result = await this.prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        paymentTransaction: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const restaurant = await tx.restaurant.findUnique({
      where: {
        id: order.restaurantId,
      },
    });

    if (!restaurant || restaurant.ownerId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to reject this restaurant order',
      );
    }

    this.orderStateMachine.assertTransitionAllowed(
      order.status,
      'CANCELLED',
    );

    let refundReservation = null;

    if (
      order.paymentTransaction &&
      (order.paymentTransaction.status === 'PAID' ||
        order.paymentTransaction.status === 'REFUND_PENDING')
    ) {
      refundReservation =
        await this.paymentsService.reserveRefundInTransaction(
          tx,
          {
            paymentTransactionId:
              order.paymentTransaction.id,
            amountInPaise: order.totalInPaise,
            reason: 'Restaurant rejected order',
            idempotencyKey: `restaurant-rejection:${order.id}`,
            orderId: order.id,
          },
        );
    }

    const cancelledOrder = await tx.order.update({
      where: {
        id: orderId,
      },
      data: {
  status: 'CANCELLED',
  cancellationSource: 'RESTAURANT',
},
    });

    return {
      order: cancelledOrder,
      refundReservation,
    };
  });

  if (result.refundReservation) {
  const refund =
    await this.paymentsService.executeReservedRefund(
      result.refundReservation.id,
    );

  this.realtimeService.emitOrderStatusChanged(
    result.order.id,
    result.order.status,
    {
      orderId: result.order.id,
      restaurantId: result.order.restaurantId,
      customerId: result.order.customerId,
      cancellationSource: result.order.cancellationSource,
    },
  );

  this.realtimeService.emitRestaurantOrderUpdated(
    result.order.restaurantId,
    {
      orderId: result.order.id,
      status: result.order.status,
    },
  );

  await this.notificationsService.create({
  recipientUserId: result.order.customerId,
  type: NotificationType.ORDER_REJECTED,
  title: 'Order Rejected',
  message: 'Unfortunately, the restaurant could not accept your order.',
  relatedEntityType: 'ORDER',
  relatedEntityId: result.order.id,
});

  this.realtimeService.emitCustomerOrderUpdated(
    result.order.customerId,
    {
      orderId: result.order.id,
      status: result.order.status,
    },
  );

  return {
    ...result.order,
    refund,
  };
}

this.realtimeService.emitOrderStatusChanged(
  result.order.id,
  result.order.status,
  {
    orderId: result.order.id,
    restaurantId: result.order.restaurantId,
    customerId: result.order.customerId,
    cancellationSource: result.order.cancellationSource,
  },
);

this.realtimeService.emitRestaurantOrderUpdated(
  result.order.restaurantId,
  {
    orderId: result.order.id,
    status: result.order.status,
  },
);

this.realtimeService.emitCustomerOrderUpdated(
  result.order.customerId,
  {
    orderId: result.order.id,
    status: result.order.status,
  },
);

return result.order;
}

async cancelOrder(userId: string, orderId: string) {
 const order = await this.prisma.order.findFirst({
  where: {
    id: orderId,
    customerId: userId,
  },
  include: {
    restaurant: {
      select: {
        ownerId: true,
      },
    },
  },
});

  if (!order) {
    throw new NotFoundException('Order not found');
  }

  this.orderStateMachine.assertTransitionAllowed(
    order.status,
    'CANCELLED',
  );

  const updatedOrder = await this.prisma.order.update({
  where: {
    id: orderId,
  },
  data: {
    status: 'CANCELLED',
    cancellationSource: 'CUSTOMER',
  },
});

this.realtimeService.emitOrderStatusChanged(
  updatedOrder.id,
  updatedOrder.status,
  {
    orderId: updatedOrder.id,
    restaurantId: updatedOrder.restaurantId,
    customerId: updatedOrder.customerId,
    cancellationSource: updatedOrder.cancellationSource,
  },
);

this.realtimeService.emitRestaurantOrderUpdated(
  updatedOrder.restaurantId,
  {
    orderId: updatedOrder.id,
    status: updatedOrder.status,
    cancellationSource: updatedOrder.cancellationSource,
  },
);

this.realtimeService.emitCustomerOrderUpdated(
  updatedOrder.customerId,
  {
    orderId: updatedOrder.id,
    status: updatedOrder.status,
    cancellationSource: updatedOrder.cancellationSource,
  },
);

await this.notificationsService.create({
  recipientUserId: order.restaurant.ownerId,
  type: NotificationType.ORDER_CANCELLED,
  title: 'Order Cancelled',
  message: 'A customer has cancelled the order.',
  relatedEntityType: 'ORDER',
  relatedEntityId: updatedOrder.id,
});
return updatedOrder;
}

}