import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { StripeService } from 'src/config/stripe/stripe.service';
import {
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SubscribeUserDto,
  UpgradeSubscriptionDto,
  AddPaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/subscription.dto';
import { SubscriptionStatus } from '@prisma/client';
import { SubscriptionPeriodService } from '../subscription-period/subscription-period.service';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly subscriptionPeriodService: SubscriptionPeriodService,
  ) {}

  private async resolveStripeCustomer(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.stripeCustomerId) {
      return { user, customerId: user.stripeCustomerId };
    }

    const customer = await this.stripeService.getOrCreateCustomer(
      user.email,
      user.name,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return { user, customerId: customer.id };
  }

  // =================== ADMIN: PLAN MANAGEMENT ===================

  async createPlan(createPlanDto: CreateSubscriptionPlanDto) {
    this.logger.log(`Creating plan: ${createPlanDto.name}`);

    const existingPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: createPlanDto.name },
    });

    if (existingPlan) {
      this.logger.warn(`Plan already exists: ${createPlanDto.name}`);
      throw new ConflictException('Plan with this name already exists');
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
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      this.logger.warn(`User ${userId} already has active subscription`);
      throw new ConflictException('User already has an active subscription');
    }

    if (!plan.stripePriceId) {
      this.logger.error(`Stripe price missing for plan ${plan.id}`);
      throw new BadRequestException('Plan is not properly configured');
    }

    try {
      const { customerId } = await this.resolveStripeCustomer(userId);

      await this.stripeService.attachPaymentMethodToCustomer(
        customerId,
        subscribeDto.paymentMethodId,
      );

      const stripeSubscription = await this.stripeService.createSubscription(
        customerId,
        plan.stripePriceId,
        subscribeDto.paymentMethodId,
        {
          userId: String(userId),
          planId: String(plan.id),
        },
      );

      const stripeData = stripeSubscription as any;
      const paymentIntentData =
        this.subscriptionPeriodService.getPaymentIntentFromSubscription(
          stripeData,
        );
      const periodDates =
        this.subscriptionPeriodService.resolvePeriodDatesFromStripeResponse(
          stripeData,
          paymentIntentData.latestInvoice,
        );

      const subscription = await this.prisma.userSubscription.upsert({
        where: {
          userId_planId: {
            userId: userId,
            planId: subscribeDto.planId,
          },
        },
        update: {
          status: SubscriptionStatus.PENDING,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodStart: periodDates.currentPeriodStart,
          currentPeriodEnd: periodDates.currentPeriodEnd,
          cancelledAt: null,
        },
        create: {
          userId: userId,
          planId: subscribeDto.planId,
          status: SubscriptionStatus.PENDING,
          stripeSubscriptionId: stripeSubscription.id,
          currentPeriodStart: periodDates.currentPeriodStart,
          currentPeriodEnd: periodDates.currentPeriodEnd,
        },
        include: { plan: true },
      });

      this.logger.log(`Subscription created for user ${userId}`);
      return {
        message: 'Subscription created successfully',
        data: {
          subscription,
          stripeSubscriptionId: stripeSubscription.id,
          stripeSubscriptionStatus: stripeSubscription.status,
          paymentIntentStatus: paymentIntentData.paymentIntentStatus,
          clientSecret: paymentIntentData.clientSecret,
        },
      };
    } catch (error) {
      this.logger.error(`Subscription failed for user ${userId}`, error);
      throw error;
    }
  }

  async upgradeSubscription(
    userId: number,
    upgradeDto: UpgradeSubscriptionDto,
  ) {
    this.logger.log(`User ${userId} upgrading subscription`);

    const currentSubscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
    });

    if (!currentSubscription) {
      this.logger.warn(`No active subscription for user ${userId}`);
      throw new BadRequestException(
        'User does not have an active subscription',
      );
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

    try {
      if (currentSubscription.stripeSubscriptionId && newPlan.stripePriceId) {
        const subscriptionItemId =
          await this.stripeService.getSubscriptionItemId(
            currentSubscription.stripeSubscriptionId,
          );

        if (!subscriptionItemId) {
          throw new BadRequestException('Stripe subscription item not found');
        }

        await this.stripeService.updateSubscription(
          currentSubscription.stripeSubscriptionId,
          {
            id: subscriptionItemId,
            price: newPlan.stripePriceId,
          },
        );
      }

      const updated = await this.prisma.userSubscription.update({
        where: { id: currentSubscription.id },
        data: { planId: upgradeDto.newPlanId },
        include: { plan: true },
      });

      this.logger.log(`Subscription upgraded for user ${userId}`);
      return updated;
    } catch (error) {
      this.logger.error(`Upgrade failed for user ${userId}`, error);
      throw error;
    }
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

  async addPaymentMethod(
    userId: number,
    addPaymentMethodDto: AddPaymentMethodDto,
  ) {
    const { customerId } = await this.resolveStripeCustomer(userId);

    await this.stripeService.attachPaymentMethodToCustomer(
      customerId,
      addPaymentMethodDto.paymentMethodId,
    );

    if (addPaymentMethodDto.setAsDefault) {
      await this.stripeService.setCustomerDefaultPaymentMethod(
        customerId,
        addPaymentMethodDto.paymentMethodId,
      );
    }

    const paymentMethod = await this.stripeService.getPaymentMethod(
      addPaymentMethodDto.paymentMethodId,
    );

    return {
      message: 'Payment method added successfully',
      data: paymentMethod,
    };
  }

  async createPaymentMethodSetupIntent(userId: number) {
    const { customerId } = await this.resolveStripeCustomer(userId);

    const setupIntent = await this.stripeService.createSetupIntent(customerId);

    return {
      message: 'Setup intent created successfully',
      data: {
        customerId,
        setupIntentId: setupIntent.id,
        clientSecret: setupIntent.client_secret,
      },
    };
  }

  async getPaymentMethods(userId: number) {
    const { customerId } = await this.resolveStripeCustomer(userId);

    const [paymentMethods, defaultPaymentMethod] = await Promise.all([
      this.stripeService.listCustomerPaymentMethods(customerId),
      this.stripeService.getCustomerDefaultPaymentMethod(customerId),
    ]);

    return {
      message: 'Payment methods fetched successfully',
      data: {
        defaultPaymentMethod,
        paymentMethods: paymentMethods.data,
      },
    };
  }

  async updatePaymentMethod(
    userId: number,
    paymentMethodId: string,
    updatePaymentMethodDto: UpdatePaymentMethodDto,
  ) {
    const { customerId } = await this.resolveStripeCustomer(userId);

    const defaultPaymentMethod =
      await this.stripeService.getCustomerDefaultPaymentMethod(customerId);

    if (updatePaymentMethodDto.setAsDefault) {
      await this.stripeService.setCustomerDefaultPaymentMethod(
        customerId,
        paymentMethodId,
      );
    }

    const paymentMethod =
      await this.stripeService.getPaymentMethod(paymentMethodId);

    return {
      message: 'Payment method updated successfully',
      data: {
        paymentMethod,
        previousDefaultPaymentMethod: defaultPaymentMethod,
        currentDefaultPaymentMethod: updatePaymentMethodDto.setAsDefault
          ? paymentMethodId
          : defaultPaymentMethod,
      },
    };
  }

  async removePaymentMethod(userId: number, paymentMethodId: string) {
    const { customerId } = await this.resolveStripeCustomer(userId);

    const [paymentMethods, defaultPaymentMethod] = await Promise.all([
      this.stripeService.listCustomerPaymentMethods(customerId),
      this.stripeService.getCustomerDefaultPaymentMethod(customerId),
    ]);

    const remainingMethods = paymentMethods.data.filter(
      (paymentMethod) => paymentMethod.id !== paymentMethodId,
    );

    if (defaultPaymentMethod === paymentMethodId) {
      await this.stripeService.setCustomerDefaultPaymentMethod(
        customerId,
        remainingMethods[0]?.id ?? null,
      );
    }

    const detached =
      await this.stripeService.detachPaymentMethod(paymentMethodId);

    return {
      message: 'Payment method removed successfully',
      data: {
        detached,
        remainingPaymentMethods: remainingMethods,
        currentDefaultPaymentMethod:
          defaultPaymentMethod === paymentMethodId
            ? (remainingMethods[0]?.id ?? null)
            : defaultPaymentMethod,
      },
    };
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
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) {
          break;
        }

        const stripeSubscription =
          await this.stripeService.getSubscription(subscriptionId);
        const stripeData = stripeSubscription as any;
        const periodDates =
          this.subscriptionPeriodService.resolvePeriodDatesFromStripeResponse(
            stripeData,
            invoice,
          );

        await this.prisma.userSubscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: periodDates.currentPeriodStart,
            currentPeriodEnd: periodDates.currentPeriodEnd,
            cancelledAt: null,
          },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const subscriptionId = invoice.subscription as string | null;
        if (!subscriptionId) {
          break;
        }

        await this.prisma.userSubscription.updateMany({
          where: { stripeSubscriptionId: subscriptionId },
          data: { status: SubscriptionStatus.PENDING },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        await this.prisma.userSubscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: SubscriptionStatus.CANCELLED,
            cancelledAt: new Date(),
          },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const stripeData = subscription;
        const periodDates =
          this.subscriptionPeriodService.resolvePeriodDatesFromStripeResponse(
            stripeData,
          );

        await this.prisma.userSubscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            currentPeriodStart: periodDates.currentPeriodStart,
            currentPeriodEnd: periodDates.currentPeriodEnd,
          },
        });
        break;
      }

      default:
        break;
    }

    return { received: true, type: event.type };
  }
}
