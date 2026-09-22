import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';

import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { RazorpayService } from './razorpay.service';
import { RazorpayReconciliationProvider } from './reconciliation/razorpay-reconciliation.provider';
import { ReconciliationResolver } from './reconciliation/reconciliation-resolver.service';
import { ReconciliationResolutionService } from './reconciliation/reconciliation-resolution.service';

import { ReconciliationRunService } from './reconciliation/reconciliation-run.service';
import { ReconciliationMatcher } from './reconciliation/reconciliation-matcher.service';


@Module({
  imports: [AuthModule],

  providers: [
  PaymentsService,
  RazorpayService,
  RazorpayReconciliationProvider,
  ReconciliationMatcher,
  ReconciliationResolutionService,
  ReconciliationRunService,
],

  controllers: [PaymentsController],

  exports: [
  PaymentsService,
  RazorpayService,
  RazorpayReconciliationProvider,
  ReconciliationResolver,
  ReconciliationResolutionService,
  ReconciliationRunService,
],
})
export class PaymentsModule {}