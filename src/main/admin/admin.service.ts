import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { SubscriptionStatus, PlanTier } from '@prisma/client';

type MonthlyCountRow = {
  month: number;
  count: number | bigint;
};

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  private buildMonthlySeries(rows: MonthlyCountRow[]) {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return months.map((month, index) => {
      const row = rows.find((entry) => entry.month === index + 1);

      return {
        month,
        count: Number(row?.count ?? 0),
      };
    });
  }



  async overview() {


    const totalUsers = await this.prisma.user.count();
    const totalActiveSubscriptions = await this.prisma.userSubscription.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    const paidSubscriptions = await this.prisma.userSubscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        planType: {
          not: PlanTier.FREE,
        },
      },
      include: {
        plan: true,
      },
    });

    const totalRevenue = paidSubscriptions.reduce((sum, subscription) => {
      return sum + (subscription.plan?.price || 0);
    }, 0);

    const currentYear = new Date().getFullYear();

    const monthlyUserRows = await this.prisma.$queryRaw<MonthlyCountRow[]>`
      SELECT
        EXTRACT(MONTH FROM "createdAt")::int AS month,
        COUNT(*)::int AS count
      FROM "User"
      WHERE EXTRACT(YEAR FROM "createdAt")::int = ${currentYear}
      GROUP BY 1
      ORDER BY 1
    `;

    const monthlySubscriberRows = await this.prisma.$queryRaw<MonthlyCountRow[]>`
      SELECT
        EXTRACT(MONTH FROM "createdAt")::int AS month,
        COUNT(*)::int AS count
      FROM "UserSubscription"
      WHERE EXTRACT(YEAR FROM "createdAt")::int = ${currentYear}
        AND status = 'ACTIVE'
        AND "planType" <> 'FREE'
      GROUP BY 1
      ORDER BY 1
    `;


    return {
      totalUsers,
      totalActiveSubscriptions,
      totalRevenue,
      monthlyUsers: this.buildMonthlySeries(monthlyUserRows),
      monthlySubscribers: this.buildMonthlySeries(monthlySubscriberRows),
    };


  }

  async userManagement(filters: {
    status?: SubscriptionStatus;
    tier?: PlanTier;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build where conditions
    const whereCondition: any = {};

    if (filters.search) {
      whereCondition.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get users with filtering
    let userList = await this.prisma.user.findMany({
      where: whereCondition,
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Apply status and tier filters on fetched data
    if (filters.status || filters.tier) {
      userList = userList.filter((user) => {
        const latestSubscription = user.subscriptions?.[0];

        if (!latestSubscription) return false;

        if (filters.status && latestSubscription.status !== filters.status) {
          return false;
        }

        if (filters.tier && latestSubscription.planType !== filters.tier) {
          return false;
        }

        return true;
      });
    }

    // Get total count for pagination
    let totalCount = await this.prisma.user.count({ where: whereCondition });

    // Adjust total count if filters were applied (post-fetch filtering)
    if (filters.status || filters.tier) {
      totalCount = userList.length;
    }

    return {
      userList,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  }

  async blockUser(userId: number) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isBolocked) {
      throw new NotFoundException('User is already blocked');
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: { isBolocked: true },
    });
  }

  async unblockUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isBolocked) {
      throw new NotFoundException('User is already unblocked');
    }
    return await this.prisma.user.update({
      where: { id: userId },
      data: { isBolocked: false },
    });
  }

  async deleteUser(userId: number) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isDeleted) {
      throw new NotFoundException('User is already deleted');
    }

    const data = await this.prisma.user.update({
      where: { id: userId },
      data: { isDeleted: true },
    });

    return {
      message: 'User deleted (soft) successfully',
      data
    }
  }

}
