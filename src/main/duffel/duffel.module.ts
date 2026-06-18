import { Module } from '@nestjs/common';
import { DuffelService } from './duffel.service';
import { DuffelController } from './duffel.controller';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [DuffelController],
  providers: [DuffelService],
})
export class DuffelModule { }
