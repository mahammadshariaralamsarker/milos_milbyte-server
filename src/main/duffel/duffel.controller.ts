import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DuffelService } from './duffel.service';
import { CreateDuffelDto } from './dto/create-duffel.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('duffel')
export class DuffelController {
  constructor(private readonly duffelService: DuffelService) { }

  @Post('create-search')
  async createSearchFlight(@Body() createDuffelDto: CreateDuffelDto) {
    return await this.duffelService.createSearchFlight(createDuffelDto);
  }

  @Post('create-order')
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    return await this.duffelService.createOrder(createOrderDto);
  }

}
