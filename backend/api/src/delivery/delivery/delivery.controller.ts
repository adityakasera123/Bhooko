import { Body, Controller, Post } from '@nestjs/common';

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
}