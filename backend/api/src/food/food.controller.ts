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
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';
import { UpdateFoodItemAvailabilityDto } from './dto/update-food-item-availability.dto';
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

    @Post('restaurants/:restaurantId/food-items')
  @UseGuards(JwtAuthGuard)
  async createFoodItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('restaurantId') restaurantId: string,
    @Body() data: CreateFoodItemDto,
  ) {
    return this.foodService.createFoodItem(
      user.userId,
      restaurantId,
      data,
    );
  }


    @Get('restaurants/:restaurantId/food-items')
  async getFoodItems(
    @Param('restaurantId') restaurantId: string,
  ) {
    return this.foodService.getFoodItems(restaurantId);
  }


    @Get('food-items/:id')
  async getFoodItem(
    @Param('id') foodItemId: string,
  ) {
    return this.foodService.getFoodItem(foodItemId);
  }

    @Patch('food-items/:id')
  @UseGuards(JwtAuthGuard)
  async updateFoodItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') foodItemId: string,
    @Body() data: UpdateFoodItemDto,
  ) {
    return this.foodService.updateFoodItem(
      user.userId,
      foodItemId,
      data,
    );
  }


    @Delete('food-items/:id')
  @UseGuards(JwtAuthGuard)
  async deleteFoodItem(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') foodItemId: string,
  ) {
    return this.foodService.deleteFoodItem(
      user.userId,
      foodItemId,
    );
  }


    @Patch('food-items/:id/availability')
  @UseGuards(JwtAuthGuard)
  async updateFoodItemAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') foodItemId: string,
    @Body() data: UpdateFoodItemAvailabilityDto,
  ) {
    return this.foodService.updateFoodItemAvailability(
      user.userId,
      foodItemId,
      data,
    );
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