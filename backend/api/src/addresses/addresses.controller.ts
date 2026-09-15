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
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(
    private readonly addressesService: AddressesService,
  ) {}

  @Get()
  async getMyAddresses(
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.addressesService.getMyAddresses(user.userId);
  }

  @Get(':id')
  async getMyAddress(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.getMyAddress(
      user.userId,
      addressId,
    );
  }

  @Post()
  async createAddress(
    @CurrentUser() user: CurrentUserPayload,
    @Body() data: CreateAddressDto,
  ) {
    return this.addressesService.createAddress(
      user.userId,
      data,
    );
  }

  @Patch(':id')
  async updateAddress(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') addressId: string,
    @Body() data: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(
      user.userId,
      addressId,
      data,
    );
  }

  @Delete(':id')
  async deleteAddress(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') addressId: string,
  ) {
    return this.addressesService.deleteAddress(
      user.userId,
      addressId,
    );
  }
}