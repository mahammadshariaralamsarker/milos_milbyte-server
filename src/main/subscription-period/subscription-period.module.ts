import { Module } from '@nestjs/common';
import { SubscriptionPeriodService } from './subscription-period.service';

@Module({
  providers: [SubscriptionPeriodService],
  exports: [SubscriptionPeriodService],
})
export class SubscriptionPeriodModule {}
