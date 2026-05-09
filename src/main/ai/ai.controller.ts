import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { AiService } from './ai.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { UserRoles } from '@prisma/client';
import { Roles } from 'src/main/auth/decorators/roles.decorator';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';


@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) { }

  @Post('generate-ai-response')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  async createAIResponse(@Body() createAiDto: CreateAiDto, @Req() req) {
    return await this.aiService.createAIResponse(createAiDto, req.user.sub);
  }


  @Get('generate-ai-response')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.CLIENT)
  @ApiBearerAuth()
  async findAllChat(@Req() req) {
    return await this.aiService.findAllChat(req.user.sub);
  }

}

