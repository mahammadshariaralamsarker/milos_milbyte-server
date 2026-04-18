import { PrismaClient } from '@prisma/client';
import { seedSuperAdmin } from './seeds/super-admin.seed';

const prisma = new PrismaClient();

async function main() {
  await seedSuperAdmin(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Prisma seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
