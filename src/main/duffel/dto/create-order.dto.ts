import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class PassengerDto {
    @ApiProperty({ example: 'passenger_123', description: 'Unique identifier for the passenger' })
    id!: string;

    @ApiProperty({ example: 'Mr', description: 'Title of the passenger' })
    title!: string;

    @ApiProperty({ example: 'Male', description: 'Gender of the passenger' })
    gender!: string;

    @ApiProperty({ example: 'John', description: 'Given name of the passenger' })
    given_name!: string;

    @ApiProperty({ example: 'Doe', description: 'Family name of the passenger' })
    family_name!: string;

    @ApiProperty({ example: '1990-01-01', description: 'Date of birth of the passenger' })
    born_on!: string;

    @ApiProperty({ example: 'john.doe@gmail.com', description: 'Email address of the passenger' })
    email!: string;

    @ApiProperty({ example: '+1234567890', description: 'Phone number of the passenger' })
    phone_number!: string;

    @ApiProperty({ description: 'Array of identity documents for the passenger' })
    identity_documents?: {
        type: string;
        unique_identifier: string;
        issuing_country_code: string;
        expires_on: string;
    }[];
}

export class PaymentDto {
    three_d_secure_session_id?: string;
    currency!: string;
    amount!: string;
    type?: string;
}

export class ServiceDto {
    quantity!: number;
    id!: string;
}

export class CreateOrderDto {
    @ApiProperty({ example: ['offer_123', 'offer_456'], description: 'Array of selected offer IDs' })
    @IsNotEmpty()
    selected_offers!: string[];

    @ApiProperty({ description: 'Array of payment details' })
    @IsNotEmpty()
    payments!: PaymentDto[];

    @ApiProperty({ description: 'Array of passenger details' })
    @IsNotEmpty()
    passengers!: PassengerDto[];

    @ApiProperty({ description: 'Array of service details' })
    @IsNotEmpty()
    services?: ServiceDto[];

    @ApiProperty({ example: 'instant', description: 'Type of the order' })
    @IsNotEmpty()
    type!: 'instant' | 'hold';
}