import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { FoodService } from './food.service';

@Controller()
export class FoodController {
  constructor(
    private readonly foodService: FoodService,
  ) {}

  @Post('restaurants/:restaurantId/categories')
  @UseGuards(JwtAuthGuard)
  async createCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() data: CreateCategoryDto,
  ) {
    return this.foodService.createCategory(
      user.userId,
      restaurantId,
      data,
    );
  }

  @Get('restaurants/:restaurantId/categories')
  async getCategories(
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.foodService.getCategories(restaurantId);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard)
  async updateCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') categoryId: string,
    @Body() data: UpdateCategoryDto,
  ) {
    return this.foodService.updateCategory(
      user.userId,
      categoryId,
      data,
    );
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  async deleteCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') categoryId: string,
  ) {
    return this.foodService.deleteCategory(
      user.userId,
      categoryId,
    );
  }
}