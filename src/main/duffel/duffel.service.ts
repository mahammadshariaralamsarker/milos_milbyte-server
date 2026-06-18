import { HttpException, Injectable } from '@nestjs/common';
import { CreateDuffelDto } from './dto/create-duffel.dto';
import { UpdateDuffelDto } from './dto/update-duffel.dto';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class DuffelService {
  private readonly baseUrl = 'https://api.duffel.com';
  private readonly headers;
  constructor(private readonly httpService: HttpService, private configService: ConfigService) {
    this.headers = {
      'Accept-Encoding': 'gzip',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Duffel-Version': 'v2',
      'Authorization': `Bearer ${process.env.DUFFEL_API_KEY}`,
    };
  }
  async createSearchFlight(createDuffelDto: CreateDuffelDto,

  ) {
    const url = 'https://api.duffel.com/air/offer_requests';
    const payload = {
      data: {
        slices: [
          {
            origin: 'NYC',
            destination: 'ATL',
            departure_date: '2026-07-21',
          },

        ],
        passengers: [
          {
            type: 'adult',
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

  async createOrder(createOrderDto: CreateOrderDto) {


    const createOrderPayload = {
      data: {
        selected_offers: ['off_0000B7ScFqGNLDkRTh5yA3'], // must be an array
        payments: [
          {
            three_d_secure_session_id: '3ds_0000AWr2XsTR1F1Vp34gh5',
            currency: 'USD',
            amount: '301.57',
          },
        ],
        services: [{ quantity: 1, id: 'ase_00009hj8USM7Ncg31cB123' }],
        type: 'instant',
        passengers: [
          {
            id: 'pas_0000B7ScFqGNLDkRTh5yA3',
            title: 'mr',
            gender: 'male',
            given_name: 'John',
            family_name: 'Doe',
            born_on: '1990-01-01',
            email: 'john.doe@example.com',
          },
        ],
      },
    };


    try {
      const response = await axios.post(
        `${this.baseUrl}/air/orders`,
        createOrderPayload,
        { headers: this.headers },
      );

      console.log(response);
    } catch (error) {
      console.error('Error creating order:', error);
    }
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
