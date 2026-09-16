import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getCart(@CurrentUser() user: CurrentUserPayload) {
    return this.cartService.getCart(user.userId);
  }

   @Post('items')
  @UseGuards(JwtAuthGuard)
  async addCartItem(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addCartItem(user.userId, dto);
  }
}