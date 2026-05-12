import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsNotEmpty()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsNotEmpty()
  lastName?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsNotEmpty()
  phoneNumber?: string;

  @ApiPropertyOptional({ example: 'Banani 1/2  ' })
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional({ example: 'Dhaka ' })
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional({ example: 'Gulsan  ' })
  @IsNotEmpty()
  state?: string;

  @ApiPropertyOptional({ example: '5620 ' })
  @IsNotEmpty()
  zipCode?: string;

  @ApiPropertyOptional({ example: 'Bangladesh ' })
  @IsNotEmpty()
  country?: string;
}
