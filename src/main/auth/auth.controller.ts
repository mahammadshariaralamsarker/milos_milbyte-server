import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRoles } from '@prisma/client';

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
    email: string;
    role: UserRoles;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ================= REGISTER =================
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  // ================= LOGIN =================
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  // ================= PROTECTED ROUTES myself=================
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    return await this.authService.getMe(req.user.sub);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @Get('change-profile-data')
  async profileUpdate(
    @Req() req: AuthenticatedRequest,
    @Body() updateData: UpdateProfileDto,
  ) {
    return await this.authService.profileUpdate(req.user.sub, updateData);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
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

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
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

  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }
}
