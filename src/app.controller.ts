import { Controller, Get, Query } from '@nestjs/common';
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

  @Get('payment/success')
  @ApiOperation({ summary: 'Stripe payment success landing page' })
  getPaymentSuccess(@Query('session_id') sessionId?: string) {
    return {
      message: 'Payment completed successfully',
      sessionId: sessionId ?? null,
    };
  }

  @Get('payment/cancel')
  @ApiOperation({ summary: 'Stripe payment cancel landing page' })
  getPaymentCancel() {
    return {
      message: 'Payment was cancelled',
    };
  }
}
