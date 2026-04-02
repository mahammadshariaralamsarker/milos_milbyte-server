import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): { message: string } {
    return { message: 'NestJS + Prisma setup is running' };
  }

  async getHealth(): Promise<{ status: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch {
      return { status: 'ok', database: 'disconnected' };
    }
  }
}
