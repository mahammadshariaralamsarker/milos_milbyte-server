import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Public')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Root health message' })
  getHello(): { message: string } {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Application health check' })
  getHealth(): Promise<{ status: string; database: string }> {
    return this.appService.getHealth();
  }
}
