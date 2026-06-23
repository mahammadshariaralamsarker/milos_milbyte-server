import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class newPasswordDto {
    @ApiProperty({ example: 'eyJhbGciOiJ..........' })
    @IsString()
    resetToken!: string;

    @ApiProperty({ example: '12345678' })
    @IsString()
    @MinLength(6)
    password!: string;
}
