import { PartialType } from '@nestjs/swagger';
import { CreateDuffelDto } from './create-duffel.dto';

export class UpdateDuffelDto extends PartialType(CreateDuffelDto) {}
