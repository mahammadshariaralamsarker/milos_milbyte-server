import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './config/prisma/prisma.module';
import { AuthModule } from './main/auth/auth.module';
import { RedisModule } from './config/redis/redis.module';
import { DeployFilesModule } from './main/deploy-files/deploy-files.module';

@Module({
  imports: [PrismaModule, RedisModule, DeployFilesModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
