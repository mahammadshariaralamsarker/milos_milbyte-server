import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PlanTier, UserRoles } from '@prisma/client';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from '@nestjs/cache-manager';
import { hash, compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // ================= REGISTER =================

  async register(registerDto: RegisterDto) {
    const userExists = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (userExists) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await hash(registerDto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        name: registerDto.name,
        password: passwordHash,
        role: registerDto.role ?? UserRoles.CLIENT,
      },
    });

    const freePlan = await this.prisma.subscriptionPlan.findFirst({
      where: { tier: PlanTier.FREE },
    });

    if (!freePlan) {
      throw new NotFoundException('Free subscription plan not found');
    }

    const userSubscription = await this.prisma.userSubscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        planType: freePlan.tier,
      },
    });
    return {
      message: 'Registration successful',
      user: this.sanitizeUser(user),
      subscription: userSubscription,
    };
  }

  // ================= LOGIN =================
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful',
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  // ================= GET ME =================
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mySubscription = await this.prisma.userSubscription.findFirst({
      where: { userId: Number(userId) },
      include: {
        plan: true,
      },
    });

    return {
      user: this.sanitizeUser(user),
      mySubscriptionName: mySubscription?.plan.name,
    };
  }

  // ================= UPDATE PROFILE =================
  async updateProfilePicture(
    userId: string,
    updateProfilePictureDto: UpdateProfilePictureDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: Number(userId) },
      data: {
        profilePicture: updateProfilePictureDto.filename,
      },
    });
    return {
      message: 'Profile picture updated successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  // ================= CHANGE PASSWORD =================
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordCorrect = await compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordCorrect) {
      throw new UnauthorizedException('Current password does not match');
    }

    const hashedNewPassword = await hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: Number(userId) },
      data: { password: hashedNewPassword },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  // ================= FORGOT PASSWORD =================
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      return {
        message:
          'If this email exists, a password reset link has been generated.',
      };
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetKey = this.getResetCacheKey(resetToken);

    await this.cacheManager.set(resetKey, user.id, 15 * 60 * 1000);

    return {
      message: 'Password reset link generated',
      resetLink: `${this.getAppUrl()}/auth/reset-password?token=${resetToken}`,
      expiresInMinutes: 15,
    };
  }

  // ================= RESET PASSWORD =================
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const resetKey = this.getResetCacheKey(resetPasswordDto.token);
    const userId = await this.cacheManager.get<number>(resetKey);

    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await hash(resetPasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.cacheManager.del(resetKey);

    return {
      message: 'Password reset successful',
    };
  }

  async profileUpdate(userId: string, updateData: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: Number(userId) },
      data: {
        name:
          updateData.firstName && updateData.lastName
            ? `${updateData.firstName} ${updateData.lastName}`
            : user.name,
        profilePicture: updateData.filename || user.profilePicture,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: this.sanitizeUser(updatedUser),
    };
  }

  // ================= UTIL =================
  private sanitizeUser<T extends { password: string }>(user: T) {
    const { ...safeUser } = user;
    return safeUser;
  }

  private getResetCacheKey(token: string) {
    return `password-reset:${token}`;
  }

  private getAppUrl() {
    return (
      process.env.APP_URL ||
      process.env.BASE_URL ||
      `http://localhost:${process.env.PORT || '3000'}`
    );
  }
}
