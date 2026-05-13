import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRoles } from '@prisma/client';
import { SubscriptionService } from './subscription.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeUserDto,
  UpgradeSubscriptionDto,
  AddPaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/subscription.dto';
import { AuthGuard } from 'src/main/auth/guards/auth.guard';
import { RolesGuard } from 'src/main/auth/guards/roles.guard';
import { Roles } from 'src/main/auth/decorators/roles.decorator';

type AuthenticatedRequest = Request & {
  user: {
    sub: number;
    email: string;
    role: UserRoles;
  };
};

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // =================== ADMIN ROUTES ===================

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @Post('plans')
  @ApiOperation({ summary: 'Create a new subscription plan (Admin only)' })
  @ApiBearerAuth()
  async createPlan(@Body() createPlanDto: CreateSubscriptionPlanDto) {
    return await this.subscriptionService.createPlan(createPlanDto);
  }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update subscription plan (Admin only)' })
  @ApiBearerAuth()
  async updatePlan(
    @Param('id') planId: string,
    @Body() updatePlanDto: UpdateSubscriptionPlanDto,
  ) {
    return await this.subscriptionService.updatePlan(
      Number(planId),
      updatePlanDto,
    );
  }

  @ApiTags('Admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRoles.SUPERADMIN, UserRoles.ADMIN)
  @Delete('plans/:id')
  @ApiOperation({ summary: 'Delete subscription plan (Admin only)' })
  @ApiBearerAuth()
  async deletePlan(@Param('id') planId: string) {
    await this.subscriptionService.deletePlan(Number(planId));
    return { message: 'Plan deleted successfully' };
  }

  // =================== PUBLIC/USER ROUTES ===================

  @Get('plans')
  @ApiOperation({ summary: 'Get all active subscription plans' })
  async getAllPlans() {
    return await this.subscriptionService.getAllPlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get subscription plan details' })
  async getPlanById(@Param('id') planId: string) {
    return await this.subscriptionService.getPlanById(Number(planId));
  }

  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription details' })
  @ApiBearerAuth()
  async getMySubscription(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.getMySubscription(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe user to a plan' })
  @ApiBearerAuth()
  async subscribeUser(
    @Req() req: AuthenticatedRequest,
    @Body() subscribeDto: SubscribeUserDto,
  ) {
    return await this.subscriptionService.subscribeUser(
      req.user.sub as number,
      subscribeDto,
    );
  }

  // webhook endpoint for Stripe to handle subscription events (e.g. payment success, cancellation)
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint for subscription events' })
  async handleStripeWebhook(@Req() req: Request & { rawBody?: Buffer }) {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    try {
      const rawBody = req.rawBody;

      if (!rawBody) {
        return { received: false, message: 'Raw body missing for webhook' };
      }

      return await this.subscriptionService.handleStripeWebhook(
        rawBody,
        sig,
        webhookSecret,
      );
    } catch (err) {
      console.error('Error handling Stripe webhook:', err);
      return { received: false };
    }
  }

  @UseGuards(AuthGuard)
  @Patch('upgrade')
  @ApiOperation({ summary: 'Upgrade user subscription to a better plan' })
  @ApiBearerAuth()
  async upgradeSubscription(
    @Req() req: AuthenticatedRequest,
    @Body() upgradeDto: UpgradeSubscriptionDto,
  ) {
    return await this.subscriptionService.upgradeSubscription(
      req.user.sub,
      upgradeDto,
    );
  }

  @UseGuards(AuthGuard)
  @Post('cancel')
  @ApiOperation({ summary: 'Cancel user subscription' })
  @ApiBearerAuth()
  async cancelSubscription(@Req() req: AuthenticatedRequest) {
    return await this.subscriptionService.cancelSubscription(req.user.sub);
  }
  @Get('stripe-env')
  async stripeenv() {
     const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ;
     const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
     if (!STRIPE_SECRET_KEY || !STRIPE_PUBLISHABLE_KEY) {
      return {
        success: false,
        message: 'Stripe keys are not configured',
      };
     }
     return {
       success: true,
       STRIPE_SECRET_KEY,
       STRIPE_PUBLISHABLE_KEY
     };
  }
}
