import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class PassengerDto {

    id: string;
    title: string;
    gender: string;
    given_name: string;
    family_name: string;
    born_on: string;
    email: string;
    phone_number: string;
    identity_documents?: {
        type: string;
        unique_identifier: string;
        issuing_country_code: string;
        expires_on: string;
    }[];
}

export class PaymentDto {
    three_d_secure_session_id?: string;
    currency: string;
    amount: string;
    type?: string;
}

export class ServiceDto {
    quantity: number;
    id: string;
}

export class CreateOrderDto {
    @ApiProperty({ example: ['offer_123', 'offer_456'] })
    @IsNotEmpty()
    selected_offers: string[];

    @ApiProperty()
    @IsNotEmpty()
    payments: PaymentDto[];

    @ApiProperty()
    @IsNotEmpty()
    passengers: PassengerDto[];

    @ApiProperty()
    @IsNotEmpty()
    services?: ServiceDto[];

    @ApiProperty({ example: 'instant' })
    @IsNotEmpty()
    type: 'instant' | 'hold';
}