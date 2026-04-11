import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { StripeService } from 'src/config/stripe/stripe.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeUserDto,
  UpgradeSubscriptionDto,
} from './dto/subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  // =================== ADMIN: PLAN MANAGEMENT ===================

  async createPlan(createPlanDto: CreateSubscriptionPlanDto) {
    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: createPlanDto.name },
    });

    if (existingPlan) {
      throw new ConflictException('Plan with this name already exists');
    }

    // Create Stripe product and price
    const product = await this.stripeService.createProduct(
      createPlanDto.name,
      createPlanDto.description,
    );

    const price = await this.stripeService.createPrice(
      product.id,
      createPlanDto.price,
      createPlanDto.currency,
    );

    return await this.prisma.subscriptionPlan.create({
      data: {
        name: createPlanDto.name,
        description: createPlanDto.description,
        tier: createPlanDto.tier,
        price: createPlanDto.price,
        currency: createPlanDto.currency || 'USD',
        features: createPlanDto.features,
        stripePriceId: price.id,
        isActive: createPlanDto.isActive ?? true,
      },
    });
  }

  async updatePlan(planId: number, updatePlanDto: UpdateSubscriptionPlanDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updatePlanDto,
    });
  }

  async deletePlan(planId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    // Check if any users have active subscriptions to this plan
    const activeSubscriptions = await this.prisma.userSubscription.findMany({
      where: {
        planId: planId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (activeSubscriptions.length > 0) {
      throw new BadRequestException(
        'Cannot delete plan with active subscriptions',
      );
    }

    return await this.prisma.subscriptionPlan.delete({
      where: { id: planId },
    });
  }

  async getAllPlans() {
    return await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getPlanById(planId: number) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  // =================== USER: SUBSCRIPTION MANAGEMENT ===================

  async subscribeUser(userId: number, subscribeDto: SubscribeUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscribeDto.planId },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.isActive) {
      throw new BadRequestException('This plan is not available');
    }

    // Check if user already has an active subscription
    const existingSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new ConflictException('User already has an active subscription');
    }

    // Create Stripe customer if not exists
    // For now, we'll use email-based customer identifier
    // In production, store Stripe customer ID in User table

    // Create Stripe subscription
    if (!plan.stripePriceId) {
      throw new BadRequestException('Plan is not properly configured');
    }

    const stripeSubscription = await this.stripeService.createSubscription(
      user.email,
      plan.stripePriceId,
    );

    // Create user subscription in database
    const stripeData = stripeSubscription as any;
    return await this.prisma.userSubscription.create({
      data: {
        userId: userId,
        planId: subscribeDto.planId,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: stripeSubscription.id,
        currentPeriodStart:
          stripeData.current_period_start &&
          new Date(stripeData.current_period_start * 1000),
        currentPeriodEnd:
          stripeData.current_period_end &&
          new Date(stripeData.current_period_end * 1000),
      },
      include: { plan: true },
    });
  }

  async upgradeSubscription(
    userId: number,
    upgradeDto: UpgradeSubscriptionDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    if (!currentSubscription) {
      throw new BadRequestException(
        'User does not have an active subscription',
      );
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: upgradeDto.newPlanId },
    });

    if (!newPlan) {
      throw new NotFoundException('New plan not found');
    }

    if (!newPlan.isActive) {
      throw new BadRequestException('New plan is not available');
    }

    if (newPlan.price < currentSubscription.plan.price) {
      throw new BadRequestException(
        'Can only upgrade to a more expensive plan',
      );
    }

    // Update Stripe subscription
    if (currentSubscription.stripeSubscriptionId && newPlan.stripePriceId) {
      await this.stripeService.updateSubscription(
        currentSubscription.stripeSubscriptionId,
        {
          items: [
            {
              id: currentSubscription.stripeSubscriptionId, // This would need the actual subscription item ID
              price: newPlan.stripePriceId,
            },
          ],
        },
      );
    }

    // Update database subscription
    return await this.prisma.userSubscription.update({
      where: { id: currentSubscription.id },
      data: { planId: upgradeDto.newPlanId },
      include: { plan: true },
    });
  }

  async cancelSubscription(userId: number) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Cancel Stripe subscription
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        false, // Cancel at period end
      );
    }

    // Update database
    return await this.prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });
  }

  async getUserSubscription(userId: number) {
    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId: userId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found for this user');
    }

    return subscription;
  }

  async getUserActiveSubscription(userId: number) {
    return await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });
  }

  async checkUserSubscriptionAccess(userId: number, requiredFeature: string) {
    const activeSubscription = await this.getUserActiveSubscription(userId);

    if (!activeSubscription) {
      throw new ForbiddenException('Active subscription required');
    }

    const features = JSON.parse(activeSubscription.plan.features || '[]');

    if (!features.includes(requiredFeature)) {
      throw new ForbiddenException(
        `Feature "${requiredFeature}" not available in your plan`,
      );
    }

    return activeSubscription;
  }
}
