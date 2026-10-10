import { CronExpression } from '@nestjs/schedule';

import { PushReceiptService } from './push-receipt.service';

describe('PushReceiptService scheduler', () => {
  it('should schedule receipt processing every five minutes', () => {
    const metadata = Reflect.getMetadata(
      'SCHEDULE_CRON_OPTIONS',
      PushReceiptService.prototype.processPendingReceipts,
    );

    expect(metadata).toBeDefined();
    expect(metadata).toEqual(
      expect.objectContaining({
        cronTime: CronExpression.EVERY_5_MINUTES,
      }),
    );
  });
});
