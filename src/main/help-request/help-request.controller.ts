import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import {
  CreateHelpRequestDto,
  UpdateHelpRequestDto,
} from './dto/help-request.dto';
import { HelpRequestService } from './help-request.service';

@ApiTags('Help Requests')
@Controller('help-requests')
export class HelpRequestController {
  constructor(private readonly helpRequestService: HelpRequestService) {}

  @Post()
  @ApiOperation({ summary: 'Submit help request (public)' })
  async create(@Body() createHelpRequestDto: CreateHelpRequestDto) {
    return this.helpRequestService.create(createHelpRequestDto);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all help requests (Admin only)' })
  async findAll() {
    return this.helpRequestService.findAll();
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one help request (Admin only)' })
  async findOne(@Param('id') id: string) {
    return this.helpRequestService.findOne(Number(id));
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update help request status/reply (Admin only)' })
  async update(
    @Param('id') id: string,
    @Body() updateHelpRequestDto: UpdateHelpRequestDto,
  ) {
    return this.helpRequestService.update(Number(id), updateHelpRequestDto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete help request (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.helpRequestService.remove(Number(id));
  }
}
