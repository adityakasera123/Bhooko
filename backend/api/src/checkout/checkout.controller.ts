import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CheckoutService } from './checkout.service';
import { CheckoutPreviewDto } from './dto/checkout-preview.dto';

@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post('preview')
  @UseGuards(JwtAuthGuard)
  async preview(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CheckoutPreviewDto,
  ) {
    return this.checkoutService.preview(
      user.userId,
      dto.addressId,
    );
  }
}
