
import {
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../auth/decorators/current-user.decorator';

import { RegisterPushDeviceDto } from './dto/register-push-device.dto';
import { PushDevicesService } from './push-devices.service';

import { DeactivatePushDeviceDto } from './dto/deactivate-push-device.dto';


@Controller('notifications/push-devices')
@UseGuards(JwtAuthGuard)
export class PushDevicesController {
  constructor(
    private readonly pushDevicesService: PushDevicesService,
  ) {}

  @Post()
  async register(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RegisterPushDeviceDto,
  ) {
    return this.pushDevicesService.register(user.userId, dto);
  }

  
  @Delete()
  async deactivate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DeactivatePushDeviceDto,
  ) {
    return this.pushDevicesService.deactivate(
      user.userId,
      dto.pushToken,
    );
  }

}
