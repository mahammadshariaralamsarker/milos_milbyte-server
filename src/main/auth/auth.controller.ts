import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  async create(@Body() createAuthDto: CreateAuthDto) {
    return await this.authService.create(createAuthDto);
  }

  @Get()
  async findAll() {
    return await this.authService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.authService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return await this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.authService.remove(+id);
  }
}
