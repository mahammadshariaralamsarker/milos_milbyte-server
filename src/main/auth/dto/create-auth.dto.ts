import { ApiProperty } from '@nestjs/swagger';
import { UserRoles } from '@prisma/client';

export class CreateAuthDto {
  @ApiProperty({
    description: 'The email of the user',
    example: 'test@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    example: 'password',
  })
  password: string;

  @ApiProperty({
    description: 'The role of the user',
    example: UserRoles.CLIENT,
  })
  role: UserRoles;
}
