import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
  ) {}

  @Post()
  async createDelivery(
    @Body() dto: CreateDeliveryDto,
  ) {
    return this.deliveryService.createDelivery(dto.orderId);
  }

  @Get(':deliveryId')
  @UseGuards(JwtAuthGuard)
  async getCustomerTracking(
    @Param('deliveryId') deliveryId: string,
    @Req() req: any,
  ) {
    return this.deliveryService.getCustomerTracking(
      deliveryId,
      req.user.userId,
    );
  }
}