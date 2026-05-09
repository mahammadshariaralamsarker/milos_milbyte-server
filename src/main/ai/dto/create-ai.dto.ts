import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class CreateAiDto {

  @ApiProperty({
    description: 'The message from the user to the AI',
    example: 'I want to plan a trip to Paris next month.',
  })
  @IsNotEmpty()
  message!: string;

}
