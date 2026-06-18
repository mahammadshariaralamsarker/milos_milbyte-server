import { Module } from '@nestjs/common';
import { DuffelService } from './duffel.service';
import { DuffelController } from './duffel.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [DuffelController],
  providers: [DuffelService],
})
export class DuffelModule { }
