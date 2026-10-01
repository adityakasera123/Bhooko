import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { CheckServiceabilityDto } from './dto/check-serviceability.dto';
import { ServiceabilityService } from './serviceability.service';

@Controller('serviceability')
export class ServiceabilityController {
  constructor(
    private readonly serviceabilityService: ServiceabilityService,
  ) {}

  @Post('check')
  @UseGuards(JwtAuthGuard)
  async checkServiceability(
    @Req() req: { user: { userId: string } },
    @Body() dto: CheckServiceabilityDto,
  ) {
    return this.serviceabilityService.getServiceabilityData(
      req.user.userId,
      dto.addressId,
      dto.restaurantId,
    );
  }
}