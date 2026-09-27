import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

import { AssignRiderDto } from './dto/assign-rider.dto';
import { CancelDeliveryDto } from './dto/cancel-delivery.dto';
import { FailDeliveryDto } from './dto/fail-delivery.dto';
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

  @Post(':assignmentId/accept')
  async acceptAssignment(
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentService.acceptAssignment(
      assignmentId,
    );
  }

  @Post(':assignmentId/reject')
  async rejectAssignment(
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentService.rejectAssignment(
      assignmentId,
    );
  }

  @Post(':assignmentId/arrive')
  async arriveAtRestaurant(
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentService.arriveAtRestaurant(
      assignmentId,
    );
  }

  @Post(':assignmentId/pickup')
  async pickupDelivery(
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentService.pickupDelivery(
      assignmentId,
    );
  }

  @Post(':assignmentId/out-for-delivery')
  async outForDelivery(
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentService.outForDelivery(
      assignmentId,
    );
  }

  @Post(':assignmentId/complete')
  async completeDelivery(
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentService.completeDelivery(
      assignmentId,
    );
  }

  @Post(':assignmentId/fail')
  async failDelivery(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: FailDeliveryDto,
  ) {
    return this.assignmentService.failDelivery(
      assignmentId,
      dto.reason,
    );
  }

  @Post(':assignmentId/cancel')
  async cancelDelivery(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: CancelDeliveryDto,
  ) {
    return this.assignmentService.cancelDelivery(
      assignmentId,
      dto.reason,
    );
  }
}