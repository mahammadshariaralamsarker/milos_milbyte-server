import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DuffelService } from './duffel.service';
import { CreateDuffelDto } from './dto/create-duffel.dto';
import { UpdateDuffelDto } from './dto/update-duffel.dto';

@Controller('duffel')
export class DuffelController {
  constructor(private readonly duffelService: DuffelService) { }

  @Post('create-search')
  async createSearchFlight(@Body() createDuffelDto: CreateDuffelDto) {
    return await this.duffelService.createSearchFlight(createDuffelDto);
  }

  @Get()
  findAll() {
    return this.duffelService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.duffelService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDuffelDto: UpdateDuffelDto) {
    return this.duffelService.update(+id, updateDuffelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.duffelService.remove(+id);
  }
}
