
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
import { UpdateDeliveryLocationDto } from './dto/update-delivery-location.dto';
import { DeliveryService } from './delivery.service';

@Controller('delivery')
export class DeliveryController {
  constructor(
    private readonly deliveryService: DeliveryService,
  ) {}

  @Post(':deliveryId/location')
  @UseGuards(JwtAuthGuard)
  async updateRiderLocation(
    @Param('deliveryId') deliveryId: string,
    @Body() dto: UpdateDeliveryLocationDto,
    @Req() req: any,
  ) {
    return this.deliveryService.updateRiderLocation(
      deliveryId,
      req.user.userId,
      dto,
    );
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
