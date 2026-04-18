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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { DestinationService } from './destination.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@ApiTags('Destinations')
@Controller('destination')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create destination (Admin only)' })
  @Post()
  create(@Body() createDestinationDto: CreateDestinationDto) {
    return this.destinationService.create(createDestinationDto);
  }

  @ApiOperation({ summary: 'Get all destinations (Public)' })
  @Get()
  findAll() {
    return this.destinationService.findAll();
  }

  @ApiOperation({ summary: 'Get destination by id (Public)' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.destinationService.findOne(id);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update destination (Admin only)' })
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDestinationDto: UpdateDestinationDto,
  ) {
    return this.destinationService.update(id, updateDestinationDto);
  }

  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete destination (Admin only)' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.destinationService.remove(id);
  }
}
