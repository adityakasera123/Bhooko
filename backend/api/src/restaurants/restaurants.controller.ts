import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { RestaurantsService } from './restaurants.service';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { UpdateRestaurantStatusDto } from './dto/update-restaurant-status.dto';

@Controller('restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
  ) {}

  @Get()
  async getRestaurants() {
    return this.restaurantsService.getRestaurants();
  }

  @Get(':id')
async getRestaurant(@Param('id') id: string) {
  return this.restaurantsService.getRestaurant(id);
}

@Patch(':id')
@UseGuards(JwtAuthGuard)
async updateRestaurant(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') restaurantId: string,
  @Body() data: UpdateRestaurantDto,
) {
  return this.restaurantsService.updateRestaurant(
    user.userId,
    restaurantId,
    data,
  );
}

@Patch(':id/status')
@UseGuards(JwtAuthGuard)
async updateRestaurantStatus(
  @CurrentUser() user: CurrentUserPayload,
  @Param('id') restaurantId: string,
  @Body() data: UpdateRestaurantStatusDto,
) {
  return this.restaurantsService.updateRestaurantStatus(
    user.userId,
    restaurantId,
    data,
  );
}


  @Post()
  @UseGuards(JwtAuthGuard)
  async createRestaurant(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: CreateRestaurantDto,
  ) {
    return this.restaurantsService.createRestaurant(
      user.userId,
      data,
    );
  }
}