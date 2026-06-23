import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRoles } from '@prisma/client';
import { verifyForgotPasswordOtp } from './dto/verifyForgotPasswordOtp.dto';
import { newPasswordDto } from './dto/newPassword.dto';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: UserRoles;
  };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // ================= REGISTER =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Register new user' })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  // ================= LOGIN =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Login user' })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  // ================= PROTECTED ROUTES myself=================
  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return await this.authService.getMe(req.user.sub);
  }

  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @Patch('update-profile')
  async profileUpdate(
    @Req() req: AuthenticatedRequest,
    @Body() updateData: UpdateProfileDto,
  ) {
    return await this.authService.profileUpdate(req.user.sub, updateData);
  }

  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile picture' })
  @Patch('change-profile-picture')
  async updateProfilePicture(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfilePictureDto: UpdateProfilePictureDto,
  ) {
    return await this.authService.updateProfilePicture(
      req.user.sub,
      updateProfilePictureDto,
    );
  }

  @ApiTags('User')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @Patch('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(
      req.user.sub,
      changePasswordDto,
    );
  }

  // ================= FORGOT  PASSWORD =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Send forgot password request' })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('verify-forgot-password-otp')
  @HttpCode(HttpStatus.OK)
  async verifyForgotPasswordOtp(
    @Body() body: verifyForgotPasswordOtp,
  ) {
    return await this.authService.verifyForgotPasswordOtp(
      body.email,
      body.otp,
    );
  }
  @Post('new-password')
  @HttpCode(HttpStatus.OK)
  async newPassword(
    @Body()
    body: newPasswordDto,
  ) {
    return await this.authService.newPassword(
      body.resetToken,
      body.password,
    );
  }


  // ================= RESET PASSWORD =================
  @ApiTags('Public')
  @ApiOperation({ summary: 'Reset password using token' })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }
}
