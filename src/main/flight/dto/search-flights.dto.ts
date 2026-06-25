import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsOptional,
  IsIn,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PassengerDto {
  @ApiProperty({ example: 'adult', enum: ['adult', 'child', 'infant_without_seat'] })
  @IsString()
  @IsIn(['adult', 'child', 'infant_without_seat'])
  type: 'adult' | 'child' | 'infant_without_seat';
}

export class SliceDto {
  @ApiProperty({ example: 'LHR', description: 'IATA airport code for origin' })
  @IsString()
  @IsNotEmpty()
  origin: string;

  @ApiProperty({ example: 'JFK', description: 'IATA airport code for destination' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: '2026-09-01', description: 'Departure date in YYYY-MM-DD format' })
  @IsDateString()
  departure_date: string;
}

export class SearchFlightsDto {
  @ApiProperty({ type: [SliceDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SliceDto)
  slices: SliceDto[];

  @ApiProperty({ type: [PassengerDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ApiProperty({
    example: 'economy',
    enum: ['economy', 'premium_economy', 'business', 'first'],
    required: false,
    description: 'Cabin class. Defaults to "economy" if not provided.',
  })
  @IsOptional()
  @IsString()
  @IsIn(['economy', 'premium_economy', 'business', 'first'])
  cabin_class?: 'economy' | 'premium_economy' | 'business' | 'first';
}
