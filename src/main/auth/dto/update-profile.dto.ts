import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;


  @ApiPropertyOptional({ example: '+1234567890' })
  phoneNumber?: string;


  @ApiPropertyOptional({ example: 'Banani 1/2  ' })
  address?: string;

  @ApiPropertyOptional({ example: 'Dhaka ' })
  city?: string;

  @ApiPropertyOptional({ example: 'Gulsan  ' })
  state?: string;

  @ApiPropertyOptional({ example: '5620 ' })
  zipCode?: string;
  @ApiPropertyOptional({ example: 'Bangladesh ' })
  country?: string;



}
