import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RestaurantOrderQueryDto } from './dto/restaurant-order-query.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.userId, dto);
  }

  @Get()
@UseGuards(JwtAuthGuard)
async getMyOrders(@CurrentUser() user: CurrentUserPayload) {
  return this.ordersService.getMyOrders(user.userId);
}

@Get('restaurant')
@UseGuards(JwtAuthGuard)
async getRestaurantOrders(
  @CurrentUser() user: CurrentUserPayload,
  @Query() dto: RestaurantOrderQueryDto,
) {
  return this.ordersService.getRestaurantOrders(
    user.userId,
    dto,
  );
}

@Get('restaurant/:id')
@UseGuards(JwtAuthGuard)
async getRestaurantOrderById(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') orderId: string,
) {
  return this.ordersService.getRestaurantOrderById(
    user.userId,
    orderId,
  );
}

@Get(':id')
@UseGuards(JwtAuthGuard)
async getOrderById(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') orderId: string,
) {
  return this.ordersService.getOrderById(user.userId, orderId);
}

@Patch(':id/status')
@UseGuards(JwtAuthGuard)
async updateOrderStatus(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') orderId: string,
  @Body() dto: UpdateOrderStatusDto,
) {
  return this.ordersService.updateOrderStatus(
    user.userId,
    user.role,
    orderId,
    dto,
  );
}


@Post(':id/accept')
@UseGuards(JwtAuthGuard)
async acceptOrder(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') orderId: string,
) {
  return this.ordersService.acceptOrder(
    user.userId,
    orderId,
  );
}

@Post(':id/reject')
@UseGuards(JwtAuthGuard)
async rejectOrder(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') orderId: string,
) {
  return this.ordersService.rejectOrder(
    user.userId,
    orderId,
  );
}

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOrder(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') orderId: string,
  ) {
    return this.ordersService.cancelOrder(
      user.userId,
      orderId,
    );
  }
}