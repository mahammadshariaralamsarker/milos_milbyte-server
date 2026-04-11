import { PrismaClient, UserRoles } from '@prisma/client';
import { hash } from 'bcryptjs';
import { Logger } from '@nestjs/common';

const logger = new Logger('SeedSuperAdmin');

export async function seedSuperAdmin(prisma: PrismaClient) {
  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';
  const rawPassword = process.env.SUPERADMIN_PASSWORD || 'admin123456';

  logger.log('Starting Super Admin seeding process...');

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      logger.warn(
        `Super Admin already exists with email: ${email}. Updating role and name...`,
      );

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          role: UserRoles.SUPERADMIN,
        },
      });

      logger.log(`Super Admin updated successfully (ID: ${existing.id})`);
      return;
    }

    logger.log('No existing Super Admin found. Creating new one...');

    const password = await hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password,
        role: UserRoles.SUPERADMIN,
      },
    });

    logger.log(
      `Super Admin created successfully (ID: ${user.id}, Email: ${user.email})`,
    );
  } catch (error) {
    logger.error('Error occurred while seeding Super Admin', error);
    throw error;
  }
}
