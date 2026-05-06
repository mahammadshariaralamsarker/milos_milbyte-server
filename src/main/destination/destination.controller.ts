import {
  UseGuards,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { DestinationQueryDto } from './dto/destination-query.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@ApiTags('Destinations')
@Controller('destination')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create destination (Admin only)' })
  @Post()
  async create(@Body() createDestinationDto: CreateDestinationDto) {
    return await this.destinationService.create(createDestinationDto);
  }

  @ApiTags('Public')
  @ApiOperation({ summary: 'Get all destinations (Public)' })
  @Get()
  async findAll(@Query() query: DestinationQueryDto) {
    return await this.destinationService.findAll(query);
  }

  @ApiTags('Public')
  @ApiOperation({ summary: 'Get destination by id (Public)' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.destinationService.findOne(id);
  }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update destination (Admin only)' })
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDestinationDto: UpdateDestinationDto,
  ) {
    return await this.destinationService.update(id, updateDestinationDto);
  }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete destination (Admin only)' })
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return await this.destinationService.remove(id);
  }
}
