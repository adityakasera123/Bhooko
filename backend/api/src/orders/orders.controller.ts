import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
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

@Get(':id')
@UseGuards(JwtAuthGuard)
async getOrderById(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') orderId: string,
) {
  return this.ordersService.getOrderById(user.userId, orderId);
}
}