import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

import { AssignRiderDto } from './dto/assign-rider.dto';
import { RejectAssignmentDto } from './dto/reject-assignment.dto';
import { AssignmentService } from './assignment.service';

@Controller('delivery/assignment')
@UseGuards(JwtAuthGuard)
export class AssignmentController {
  constructor(
    private readonly assignmentService: AssignmentService,
  ) {}

  @Post()
  async assignRider(
    @Body() dto: AssignRiderDto,
  ) {
    return this.assignmentService.assignRider(
      dto.deliveryId,
      dto.riderId,
    );
  }
}