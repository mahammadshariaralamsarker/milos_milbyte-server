import { ApiProperty } from '@nestjs/swagger';
import { UpdateProfilePictureDto } from './update-profile-picture.dto';

export class UpdateProfileDto extends UpdateProfilePictureDto {
  @ApiProperty({ required: false, example: 'John' })
  firstName?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  lastName?: string;
}
