import { ApiProperty,  } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John' })
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+1234567890' })
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ example: 'Banani 1/2  ' })
  @IsOptional()
  address?: string;

  @ApiProperty({ example: 'Dhaka ' })
  @IsOptional()
  city?: string;

  @ApiProperty({ example: 'Gulsan  ' })
  @IsOptional()
  state?: string;

  @ApiProperty({ example: '5620 ' })
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ example: 'Bangladesh ' })
  @IsOptional()
  country?: string;
}
