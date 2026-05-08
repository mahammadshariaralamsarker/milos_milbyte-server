import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { StripeModule } from 'src/config/stripe/stripe.module';
import { MailModule } from 'src/config/mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { SubscriptionPeriodModule } from '../subscription-period/subscription-period.module';

@Module({
  imports: [StripeModule, MailModule, AuthModule, SubscriptionPeriodModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
