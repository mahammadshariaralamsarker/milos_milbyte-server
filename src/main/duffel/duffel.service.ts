import { Injectable } from '@nestjs/common';
import { CreateDuffelDto } from './dto/create-duffel.dto';
import { UpdateDuffelDto } from './dto/update-duffel.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';



@Injectable()
export class DuffelService {
  constructor(private readonly httpService: HttpService) { }
  async createSearchFlight(createDuffelDto: CreateDuffelDto) {
    const url = 'https://api.duffel.com/air/offer_requests';
    const payload = {
      data: {
        slices: [
          {
            origin: 'NYC',
            destination: 'ATL',
            departure_date: '2026-07-21',
          },
          {
            origin: 'ATL',
            destination: 'NYC',
            departure_date: '2026-07-28',
          },
        ],
        passengers: [
          {
            type: 'adult',
          },
          {
            type: 'adult',
          },
          {
            age: 1,
          },
        ],
        cabin_class: 'business',
      },
    };

    const headers = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'Duffel-Version': 'v2',
      Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
      'Content-Type': 'application/json',
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, { headers }),
      );

      return response.data;
    }
    catch (error) {
      console.error('Error creating search flight:', error);
    }
  }

  async findAll() {
    return `This action returns all duffel`;
  }

  async findOne(id: number) {
    return `This action returns a #${id} duffel`;
  }

  async update(id: number, updateDuffelDto: UpdateDuffelDto) {
    return `This action updates a #${id} duffel`;
  }

  async remove(id: number) {
    return `This action removes a #${id} duffel`;
  }
}
