import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'john@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ enum: UserRoles, example: UserRoles.CLIENT })
  @IsOptional()
  @IsEnum(UserRoles)
  role?: UserRoles;
}
