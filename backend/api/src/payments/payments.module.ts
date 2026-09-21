import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayService } from './razorpay.service';
import { RazorpayReconciliationProvider } from './reconciliation/razorpay-reconciliation.provider';
import { ReconciliationResolver } from './reconciliation/reconciliation-resolver.service';
import { ReconciliationResolutionService } from './reconciliation/reconciliation-resolution.service';

@Module({
  imports: [AuthModule],

  providers: [
  PaymentsService,
  RazorpayService,
  RazorpayReconciliationProvider,
  ReconciliationResolver,
  ReconciliationResolutionService,
],

  controllers: [PaymentsController],

  exports: [
    PaymentsService,
    RazorpayService,
    RazorpayReconciliationProvider,
  ],
})
export class PaymentsModule {}