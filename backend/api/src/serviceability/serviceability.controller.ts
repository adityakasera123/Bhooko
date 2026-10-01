import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';

import { CheckServiceabilityDto } from './dto/check-serviceability.dto';
import { ServiceabilityService } from './serviceability.service';

@Controller('serviceability')
@UseGuards(JwtAuthGuard)
export class ServiceabilityController {
  constructor(
    private readonly serviceabilityService: ServiceabilityService,
  ) {}

  @Post('check')
  async checkServiceability(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: CheckServiceabilityDto,
  ) {
    return this.serviceabilityService.getServiceabilityData(
      user.userId,
      data.addressId,
      data.restaurantId,
    );
  }
}