import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayService } from './razorpay.service';

@Module({
  imports: [AuthModule],
  providers: [PaymentsService, RazorpayService],
  controllers: [PaymentsController],
  exports: [PaymentsService, RazorpayService],
})
export class PaymentsModule {}