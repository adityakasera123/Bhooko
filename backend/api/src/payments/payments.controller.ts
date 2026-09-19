import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { PaymentsService } from './payments.service';
import { RazorpayService } from './razorpay.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly razorpayService: RazorpayService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      user.userId,
      dto.orderIds,
    );
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(
      user.userId,
      dto,
    );
  }

  @Post('webhook')
  async handleWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const rawBody = request.rawBody;

    if (!rawBody) {
      throw new UnauthorizedException(
        'Webhook raw body is not available',
      );
    }

    const isValid =
      this.razorpayService.verifyWebhookSignature(
        rawBody,
        signature ?? '',
      );

    if (!isValid) {
      throw new UnauthorizedException(
        'Invalid Razorpay webhook signature',
      );
    }

    return this.paymentsService.handleWebhook(body);
  }
}
