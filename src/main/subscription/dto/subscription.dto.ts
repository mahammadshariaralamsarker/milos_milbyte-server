import { ApiProperty } from '@nestjs/swagger';
import { PlanTier } from '@prisma/client';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  MinLength,
} from 'class-validator';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Basic Plan' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ example: 'Basic features' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlanTier, example: PlanTier.BASIC })
  @IsEnum(PlanTier)
  tier!: PlanTier;

  @ApiProperty({ example: 9.99 })
  @IsNumber()
  price!: number;

  @ApiProperty({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    example: JSON.stringify(['Feature 1', 'Feature 2']),
    description: 'JSON array of features',
  })
  @IsString()
  features!: string;

  @ApiProperty({ example: false })
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSubscriptionPlanDto {
  @ApiProperty({ example: 'Updated Plan Name' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  name?: string;

  @ApiProperty({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 19.99 })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ example: JSON.stringify(['Feature 1', 'Feature 3']) })
  @IsOptional()
  @IsString()
  features?: string;

  @ApiProperty({ example: true })
  @IsOptional()
  isActive?: boolean;
}

export class SubscribeUserDto {
  @ApiProperty({ example: 1, description: 'Subscription plan ID' })
  @IsNumber()
  planId!: number;

  @ApiProperty({
    example: 'tok_visa',
    description: 'Stripe payment method token',
  })
  @IsString()
  paymentMethodId!: string;
}

export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 2, description: 'New plan ID to upgrade to' })
  @IsNumber()
  newPlanId!: number;
}
