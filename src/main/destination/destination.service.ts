import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';

@Injectable()
export class DestinationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDestinationDto: CreateDestinationDto) {
    const existing = await this.prisma.destination.findFirst({
      where: {
        AND: [
          { name: createDestinationDto.name },
          { location: createDestinationDto.location },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        'Destination with this name and location already exists',
      );
    }

    const destination = await this.prisma.destination.create({
      data: createDestinationDto,
    });

    return {
      message: 'Destination created successfully',
      destination,
    };
  }

  async findAll() {
    const destinations = await this.prisma.destination.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return {
      message: 'Destinations fetched successfully',
      destinations,
    };
  }

  async findOne(id: number) {
    const destination = await this.prisma.destination.findUnique({
      where: { id },
    });

    if (!destination) {
      throw new NotFoundException('Destination not found');
    }

    return {
      message: 'Destination fetched successfully',
      destination,
    };
  }

  async update(id: number, updateDestinationDto: UpdateDestinationDto) {
    const rest = await this.prisma.destination.findUnique({
      where: { id },
    });
    if (!rest) {
      throw new NotFoundException('Destination not found');
    }
    const destination = await this.prisma.destination.update({
      where: { id },
      data: updateDestinationDto,
    });

    return {
      message: 'Destination updated successfully',
      destination,
    };
  }

  async remove(id: number) {
    const rest = await this.prisma.destination.findUnique({
      where: { id },
    });

    if (!rest) {
      throw new NotFoundException('Destination not found');
    }

    await this.prisma.destination.delete({
      where: { id },
    });

    return {
      message: 'Destination deleted successfully',
    };
  }
}
