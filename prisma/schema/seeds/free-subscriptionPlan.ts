import { PrismaClient, PlanTier } from '@prisma/client';
import { Logger } from '@nestjs/common';

const logger = new Logger('SeedSuperAdmin');

export async function seedFreeSubscriptionPlan(prisma: PrismaClient) {
  logger.log('Starting Free Subscription Plan seeding process...');

  try {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { tier: PlanTier.FREE },
    });

    if (existing) {
      logger.warn('Free Subscription Plan already exists. Skipping...');
      return;
    }

    logger.log('No existing Free Subscription Plan found. Creating new one...');

    const freePlan = await prisma.subscriptionPlan.create({
      data: {
        name: 'Free',
        tier: PlanTier.FREE,
        price: 0,
        features: JSON.stringify({}),
      },
    });

  logger.log(`Free Subscription Plan created successfully (ID: ${freePlan.id})`);
  } catch (error) {
    logger.error('Error occurred while seeding Free Subscription Plan', error);
    throw error;
  }
}
