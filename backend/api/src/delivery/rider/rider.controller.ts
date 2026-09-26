import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RiderService } from './rider.service';
import { CreateRiderDto } from './dto/create-rider.dto';
import { UpdateRiderAvailabilityDto } from './dto/update-rider-availability.dto';
import { UpdateRiderVehicleDto } from './dto/update-rider-vehicle.dto';

@Controller('delivery/rider')
@UseGuards(JwtAuthGuard)
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Post()
  async createRider(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateRiderDto,
  ) {
    return this.riderService.createRider(
      req.user.id,
      dto.vehicleType,
      dto.vehicleNumber,
    );
  }

  @Get('me')
  async getMyRider(@Req() req: { user: { id: string } }) {
    return this.riderService.getRiderByUserId(req.user.id);
  }

  @Patch('activate')
  async activate(@Req() req: { user: { id: string } }) {
    const rider = await this.riderService.getRiderByUserId(req.user.id);

    return this.riderService.activateRider(rider.id);
  }

  @Patch('deactivate')
  async deactivate(@Req() req: { user: { id: string } }) {
    const rider = await this.riderService.getRiderByUserId(req.user.id);

    return this.riderService.deactivateRider(rider.id);
  }

  @Patch('availability')
  async setAvailability(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateRiderAvailabilityDto,
  ) {
    const rider = await this.riderService.getRiderByUserId(req.user.id);

    return this.riderService.setAvailability(
      rider.id,
      dto.availability,
    );
  }

  @Patch('vehicle')
  async updateVehicle(
    @Req() req: { user: { id: string } },
    @Body() dto: UpdateRiderVehicleDto,
  ) {
    const rider = await this.riderService.getRiderByUserId(req.user.id);

    return this.riderService.updateVehicle(
      rider.id,
      dto.vehicleType,
      dto.vehicleNumber,
    );
  }
}