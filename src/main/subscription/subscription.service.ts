import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { MailService } from 'src/config/mail/mail.service';
import { StripeService } from 'src/config/stripe/stripe.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeUserDto,
  UpgradeSubscriptionDto,
} from './dto/subscription.dto';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionPeriodService } from '../subscription-period/subscription-period.service';
import Stripe from 'stripe';
@Injectable()
export class SubscriptionService {
  private stripe: InstanceType<typeof Stripe>;
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly stripeService: StripeService,
    private readonly subscriptionPeriodService: SubscriptionPeriodService,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10',
    } as any);
  }

  private extractStripeId(value: string | { id: string } | null | undefined) {
    if (!value) {
      return null;
    }

    return typeof value === 'string' ? value : value.id;
  }

  private getPublicFrontendUrl() {
    const rawUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    try {
      return new URL(rawUrl).origin;
    } catch {
      return new URL(`http://${rawUrl}`).origin;
    }
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'canceled':
        return SubscriptionStatus.CANCELLED;
      case 'incomplete':
      case 'incomplete_expired':
      case 'past_due':
      case 'unpaid':
      default:
        return SubscriptionStatus.PENDING;
    }
  }

  private async resolveStripeCustomer(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeCustomerId) {
      try {
        const customer = await this.stripeService.getCustomer(
          user.stripeCustomerId,
        );

        if (customer && !(customer as any).deleted) {
          return { user, customerId: user.stripeCustomerId };
        }
      } catch (error) {
        this.logger.warn(
          `Stored Stripe customer ${user.stripeCustomerId} is invalid for user ${userId}, recreating customer`,
        );
      }
    }

    const customer = await this.stripeService.getOrCreateCustomer(
      user.email,
      user.firstName + ' ' + user.lastName,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return { user, customerId: customer.id };
  }

  private async syncSubscriptionFromStripe(
    stripeSubscription: any,
    invoiceData?: any,
    forcedStatus?: SubscriptionStatus,
    notifyUser = true,
  ) {
    const stripeCustomerId = this.extractStripeId(stripeSubscription.customer);
    const metadataUserId = stripeSubscription.metadata?.userId
      ? Number(stripeSubscription.metadata.userId)
      : null;
    const metadataPlanId = stripeSubscription.metadata?.subscriptionPlanId
      ? Number(stripeSubscription.metadata.subscriptionPlanId)
      : null;

    let userId = metadataUserId;

    if (!userId && stripeCustomerId) {
      const user = await this.prisma.user.findFirst({
        where: { stripeCustomerId },
      });

      userId = user?.id ?? null;
    }

    if (!userId) {
      this.logger.warn(
        `Unable to resolve local user for Stripe customer ${stripeCustomerId ?? 'unknown'}`,
      );
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(
        `User not found while syncing Stripe subscription ${stripeSubscription.id}`,
      );
      return null;
    }

    let plan: { id: number; tier: any } | null = null;

    if (metadataPlanId) {
      plan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: metadataPlanId },
      });
    }

    if (!plan) {
      const stripePriceId = stripeSubscription.items.data[0]?.price?.id;

      if (stripePriceId) {
        plan = await this.prisma.subscriptionPlan.findFirst({
          where: { stripePriceId },
        });
      }
    }

    if (!plan) {
      this.logger.warn(
        `Unable to resolve subscription plan for Stripe subscription ${stripeSubscription.id}`,
      );
      return null;
    }

    const periodDates =
      this.subscriptionPeriodService.resolvePeriodDatesFromStripeResponse(
        stripeSubscription,
        invoiceData,
      );

    const status =
      forcedStatus ??
      this.mapStripeSubscriptionStatus(stripeSubscription.status);

    const currentUserSubscription =
      await this.prisma.userSubscription.findFirst({
        where: { userId },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
      });

    const payload = {
      userId,
      planId: plan.id,
      planType: plan.tier,
      status,
      stripeSubscriptionId: stripeSubscription.id,
      currentPeriodStart: periodDates.currentPeriodStart,
      currentPeriodEnd: periodDates.currentPeriodEnd,
      cancelledAt: status === SubscriptionStatus.CANCELLED ? new Date() : null,
    };

    if (currentUserSubscription) {
      const updated = await this.prisma.userSubscription.update({
        where: { id: currentUserSubscription.id },
        data: payload,
        include: { plan: true },
      });

      if (notifyUser) {
        await this.sendSubscriptionEmailNotification({
          user,
          previousSubscription: currentUserSubscription,
          currentSubscription: updated,
          action:
            forcedStatus === SubscriptionStatus.PENDING
              ? 'failed'
              : forcedStatus === SubscriptionStatus.CANCELLED
                ? 'cancelled'
                : currentUserSubscription.planId !== plan.id
                  ? 'upgraded'
                  : 'renewed',
        });
      }

      return updated;
    }

    const created = await this.prisma.userSubscription.create({
      data: payload,
      include: { plan: true },
    });

    if (notifyUser) {
      await this.sendSubscriptionEmailNotification({
        user,
        currentSubscription: created,
        action:
          status === SubscriptionStatus.PENDING
            ? 'failed'
            : status === SubscriptionStatus.CANCELLED
              ? 'cancelled'
              : 'created',
      });
    }

    return created;
  }

  private async sendSubscriptionEmailNotification(params: {
    user: { email: string; firstName?: string | null };
    currentSubscription: {
      plan: { name: string };
      currentPeriodEnd: Date | null;
    };
    action: 'created' | 'upgraded' | 'renewed' | 'failed' | 'cancelled';
    previousSubscription?: { plan?: { name: string } | null } | null;
  }) {
    try {
      await this.mailService.sendSubscriptionEmail({
        to: params.user.email,
        name: params.user.firstName ?? '',
        action: params.action,
        planName: params.currentSubscription.plan.name,
        previousPlanName: params.previousSubscription?.plan?.name ?? null,
        periodEnd: params.currentSubscription.currentPeriodEnd,
      });
    } catch (error) {
      this.logger.warn(
        `Subscription email notification failed for ${params.user.email}`,
      );
      this.logger.warn(error);
    }
  }

  private async cancelPreviousSubscriptionIfNeeded(stripeSubscription: any) {
    const previousSubscriptionId =
      stripeSubscription.metadata?.upgradeFromSubscriptionId;

    if (!previousSubscriptionId) {
      return;
    }

    await this.stripeService.cancelSubscription(previousSubscriptionId, true);
  }

  // =================== ADMIN: PLAN MANAGEMENT ===================

  async createPlan(createPlanDto: CreateSubscriptionPlanDto) {
    this.logger.log(`Creating plan: ${createPlanDto.name}`);

    const existingPlan = await this.prisma.subscriptionPlan.findFirst({
      where: {
        AND: [
          {
            price: createPlanDto.price,
          },
          {
            name: createPlanDto.name,
          },
          {
            tier: createPlanDto.tier,
          },
        ],
      },
    });

    if (existingPlan) {
      this.logger.warn(`Plan already exists: ${createPlanDto.name}`);
      throw new ConflictException(
        'Plan with this name, price, and tier already exists',
      );
    }

    try {
      const product = await this.stripeService.createProduct(
        createPlanDto.name,
        createPlanDto.description,
      );

      const price = await this.stripeService.createPrice(
        product.id,
        createPlanDto.price,
        createPlanDto.currency,
      );

      const plan = await this.prisma.subscriptionPlan.create({
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

      this.logger.log(`Plan created successfully: ${plan.id}`);
      return plan;
    } catch (error) {
      this.logger.error(`Failed to create plan: ${createPlanDto.name}`, error);
      throw error;
    }
  }

  async updatePlan(planId: number, updatePlanDto: UpdateSubscriptionPlanDto) {
    this.logger.log(`Updating plan ID: ${planId}`);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      this.logger.warn(`Plan not found: ${planId}`);
      throw new NotFoundException('Subscription plan not found');
    }

    return await this.prisma.subscriptionPlan.update({
      where: { id: planId },
      data: updatePlanDto,
    });
  }

  async deletePlan(planId: number) {
    this.logger.log(`Deleting plan ID: ${planId}`);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      this.logger.warn(`Plan not found: ${planId}`);
      throw new NotFoundException('Subscription plan not found');
    }

    const activeSubscriptions = await this.prisma.userSubscription.findMany({
      where: {
        planId: planId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (activeSubscriptions.length > 0) {
      this.logger.warn(
        `Cannot delete plan with active subscriptions: ${planId}`,
      );
      throw new BadRequestException(
        'Cannot delete plan with active subscriptions',
      );
    }

    return await this.prisma.subscriptionPlan.delete({
      where: { id: planId },
    });
  }

  async getAllPlans() {
    this.logger.log('Fetching all active plans');
    return await this.prisma.subscriptionPlan.findMany({
      //   where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async getPlanById(planId: number) {
    this.logger.log(`Fetching plan ID: ${planId}`);

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      this.logger.warn(`Plan not found: ${planId}`);
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  async getMySubscription(userId: number) {
    this.logger.log(`Fetching subscription for user ${userId}`);

    const subscription = await this.prisma.userSubscription.findFirst({
      where: { userId },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            profilePicture: true,
            stripeCustomerId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      this.logger.warn(`Subscription not found for user ${userId}`);
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }

  // =================== USER: SUBSCRIPTION MANAGEMENT ===================

  async subscribeUser(userId: number, subscribeDto: SubscribeUserDto) {
    this.logger.log(
      `User ${userId} subscribing to plan ${subscribeDto.planId}`,
    );

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: subscribeDto.planId },
    });

    if (!plan) {
      this.logger.warn(`Plan not found: ${subscribeDto.planId}`);
      throw new NotFoundException('Subscription plan not found');
    }

    if (!plan.isActive) {
      this.logger.warn(`Inactive plan access attempt: ${plan.id}`);
      throw new BadRequestException('This plan is not available');
    }

    const existingSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
      },
    });

    if (
      existingSubscription &&
      existingSubscription.planType !== 'FREE' &&
      (existingSubscription.status === SubscriptionStatus.ACTIVE ||
        existingSubscription.status === SubscriptionStatus.PENDING)
    ) {
      this.logger.warn(`User ${userId} already has active subscription`);
      throw new ConflictException('User already has an active subscription');
    }

    if (!plan.stripePriceId) {
      this.logger.error(`Stripe price missing for plan ${plan.id}`);
      throw new BadRequestException('Plan is not properly configured');
    }

    const { customerId } = await this.resolveStripeCustomer(userId);

    const frontendUrl = this.getPublicFrontendUrl();

    const onboardingLink = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
      metadata: {
        customerId,
        userId: String(user.id),
        subscriptionPlanId: String(plan.id),
      },
      subscription_data: {
        metadata: {
          customerId,
          userId: String(user.id),
          subscriptionPlanId: String(plan.id),
        },
      },
    });

    if (!onboardingLink.url) {
      throw new BadRequestException('Unable to create Stripe checkout session');
    }

    return {
      message: 'Checkout session created successfully',
      data: {
        checkoutSessionId: onboardingLink.id,
        checkoutUrl: onboardingLink.url,
      },
    };
  }

  async upgradeSubscription(
    userId: number,
    upgradeDto: UpgradeSubscriptionDto,
  ) {
    this.logger.log(`User ${userId} upgrading subscription`);

    const currentSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSubscription) {
      this.logger.warn(`No subscription record for user ${userId}`);
      throw new NotFoundException('User does not have a subscription record');
    }

    const newPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: upgradeDto.newPlanId },
    });

    if (!newPlan || !newPlan.isActive) {
      this.logger.warn(`Invalid upgrade plan: ${upgradeDto.newPlanId}`);
      throw new BadRequestException('New plan is not available');
    }

    if (newPlan.id === currentSubscription.planId) {
      throw new BadRequestException('You are already on this plan');
    }

    if (newPlan.price < currentSubscription.plan.price) {
      throw new BadRequestException(
        'Can only upgrade to a more expensive or same price plan',
      );
    }

    if (!newPlan.stripePriceId) {
      this.logger.error(`Stripe price missing for plan ${newPlan.id}`);
      throw new BadRequestException('Plan is not properly configured');
    }

    const { customerId } = await this.resolveStripeCustomer(userId);
    const frontendUrl = this.getPublicFrontendUrl();

    const checkoutSession = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: newPlan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel`,
      metadata: {
        customerId,
        userId: String(userId),
        subscriptionPlanId: String(newPlan.id),
        upgradeFromSubscriptionId:
          currentSubscription.stripeSubscriptionId || '',
      },
      subscription_data: {
        metadata: {
          customerId,
          userId: String(userId),
          subscriptionPlanId: String(newPlan.id),
          upgradeFromSubscriptionId:
            currentSubscription.stripeSubscriptionId || '',
        },
      },
    });

    if (!checkoutSession.url) {
      throw new BadRequestException('Unable to create Stripe checkout session');
    }

    return {
      message: 'Checkout session created successfully',
      data: {
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: checkoutSession.url,
      },
    };
  }

  async cancelSubscription(userId: number) {
    this.logger.log(`Cancelling subscription for user ${userId}`);

    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      this.logger.warn(`No active subscription for user ${userId}`);
      throw new BadRequestException('No active subscription found');
    }

    try {
      if (subscription.stripeSubscriptionId) {
        await this.stripeService.cancelSubscription(
          subscription.stripeSubscriptionId,
          false,
        );
      }

      const updated = await this.prisma.userSubscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
        include: { plan: true },
      });

      this.logger.log(`Subscription cancelled for user ${userId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Cancel failed for user ${userId}`, error);
      throw error;
    }
  }

  async handleStripeWebhook(
    rawBody: Buffer,
    signature: string,
    secret: string,
  ) {
    if (!signature || !secret) {
      throw new BadRequestException(
        'Missing Stripe signature or webhook secret',
      );
    }

    const event = this.stripeService.constructWebhookEvent(
      rawBody,
      signature,
      secret,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;

        if (session.mode !== 'subscription') {
          break;
        }

        const sessionSubscriptionId = this.extractStripeId(
          session.subscription,
        );

        if (!sessionSubscriptionId) {
          this.logger.warn(
            'Checkout session completed without subscription id',
          );
          break;
        }

        const stripeSubscription = await this.stripe.subscriptions.retrieve(
          sessionSubscriptionId,
        );

        await this.syncSubscriptionFromStripe(
          stripeSubscription,
          undefined,
          undefined,
          false,
        );
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = this.extractStripeId(invoice.subscription);

        if (!subscriptionId) {
          break;
        }

        const stripeSubscription =
          await this.stripe.subscriptions.retrieve(subscriptionId);

        await this.syncSubscriptionFromStripe(
          stripeSubscription,
          invoice,
          undefined,
          true,
        );
        await this.cancelPreviousSubscriptionIfNeeded(stripeSubscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = this.extractStripeId(invoice.subscription);

        if (!subscriptionId) {
          break;
        }

        const stripeSubscription =
          await this.stripe.subscriptions.retrieve(subscriptionId);

        await this.syncSubscriptionFromStripe(
          stripeSubscription,
          invoice,
          SubscriptionStatus.PENDING,
          true,
        );
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const stripeSubscription = event.data.object as any;

        await this.syncSubscriptionFromStripe(
          stripeSubscription,
          undefined,
          undefined,
          false,
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSubscription = event.data.object as any;

        await this.syncSubscriptionFromStripe(
          stripeSubscription,
          undefined,
          SubscriptionStatus.CANCELLED,
          true,
        );
        break;
      }

      default:
        break;
    }

    return { received: true, type: event.type };
  }
}
