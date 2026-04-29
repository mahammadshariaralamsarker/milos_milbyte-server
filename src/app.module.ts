import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './config/prisma/prisma.module';
import { AuthModule } from './main/auth/auth.module';
import { RedisModule } from './config/redis/redis.module';
import { DeployFilesModule } from './config/deploy-files/deploy-files.module';
import { StripeModule } from './config/stripe/stripe.module';
import { SubscriptionModule } from './main/subscription/subscription.module';
import { HelpRequestModule } from './main/help-request/help-request.module';
import { DestinationModule } from './main/destination/destination.module';
import { SeedModule } from './main/maintenance/seed/seed.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    DeployFilesModule,
    StripeModule,
    AuthModule,
    SubscriptionModule,
    HelpRequestModule,
    DestinationModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
