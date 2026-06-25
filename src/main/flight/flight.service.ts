import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { PrismaService } from '../../config/prisma/prisma.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { BookFlightDto } from './dto/book-flight.dto';
import { BookingStatus, BookingType } from '@prisma/client';

@Injectable()
export class FlightService {
  private readonly logger = new Logger(FlightService.name);
  private readonly duffel: AxiosInstance;

  constructor(private readonly prisma: PrismaService) {
    this.duffel = axios.create({
      baseURL: 'https://api.duffel.com',
      headers: {
        Authorization: `Bearer ${process.env.DUFFEL_API_KEY}`,
        'Duffel-Version': 'v2',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // POST /flights/search
  // Calls Duffel /air/offer_requests and returns the list of offers
  // ─────────────────────────────────────────────────────────────
  async searchFlights(dto: SearchFlightsDto) {
    try {
      this.logger.log(`Searching flights: ${JSON.stringify(dto.slices)}`);

      const payload = {
        data: {
          slices: dto.slices.map((slice) => ({
            origin: slice.origin.toUpperCase(),
            destination: slice.destination.toUpperCase(),
            departure_date: slice.departure_date,
          })),
          passengers: dto.passengers,
          cabin_class: dto.cabin_class ?? 'economy',
        },
      };

      const response = await this.duffel.post(
        '/air/offer_requests?return_offers=true',
        payload,
      );

      const offerRequest = response.data.data;

      return {
        offer_request_id: offerRequest.id,
        offers: offerRequest.offers.map((offer: any) => ({
          offer_id: offer.id,
          total_amount: offer.total_amount,
          total_currency: offer.total_currency,
          expires_at: offer.expires_at,
          slices: offer.slices.map((s: any) => ({
            origin: s.origin.iata_code,
            destination: s.destination.iata_code,
            departure_at: s.segments?.[0]?.departing_at,
            arrival_at: s.segments?.[s.segments.length - 1]?.arriving_at,
            duration: s.duration,
            segments: s.segments?.map((seg: any) => ({
              flight_number: `${seg.marketing_carrier.iata_code}${seg.marketing_carrier_flight_number}`,
              aircraft: seg.aircraft?.name,
              departing_at: seg.departing_at,
              arriving_at: seg.arriving_at,
              origin: seg.origin.iata_code,
              destination: seg.destination.iata_code,
            })),
          })),
          // ⚠️ Use these passenger ids when calling POST /flights/book
          passengers: offer.passengers.map((p: any) => ({
            passenger_id: p.id,
            type: p.type,
            age: p.age,
          })),
        })),
      };
    } catch (error) {
      this.logger.error('Flight search failed', error?.response?.data ?? error.message);
      throw new HttpException(
        error?.response?.data?.errors?.[0]?.message ?? 'Flight search failed',
        error?.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // GET /flights/offers/:offer_id
  // Fetches latest pricing & availability for a specific offer
  // ─────────────────────────────────────────────────────────────
  async getOffer(offerId: string) {
    try {
      this.logger.log(`Fetching offer: ${offerId}`);

      const response = await this.duffel.get(`/air/offers/${offerId}`);
      const offer = response.data.data;

      return {
        offer_id: offer.id,
        total_amount: offer.total_amount,
        total_currency: offer.total_currency,
        expires_at: offer.expires_at,
        available: !offer.payment_requirements?.requires_instant_payment
          ? true
          : new Date(offer.payment_requirements.price_guarantee_expires_at) > new Date(),
        slices: offer.slices.map((s: any) => ({
          origin: s.origin.iata_code,
          destination: s.destination.iata_code,
          departure_at: s.segments?.[0]?.departing_at,
          arrival_at: s.segments?.[s.segments.length - 1]?.arriving_at,
          duration: s.duration,
          segments: s.segments?.map((seg: any) => ({
            flight_number: `${seg.marketing_carrier.iata_code}${seg.marketing_carrier_flight_number}`,
            aircraft: seg.aircraft?.name,
            departing_at: seg.departing_at,
            arriving_at: seg.arriving_at,
          })),
        })),
        passengers: offer.passengers,
        conditions: offer.conditions,
      };
    } catch (error) {
      this.logger.error(`Offer fetch failed for ${offerId}`, error?.response?.data ?? error.message);
      throw new HttpException(
        error?.response?.data?.errors?.[0]?.message ?? 'Offer not found or expired',
        error?.response?.status ?? HttpStatus.NOT_FOUND,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /flights/book
  // Step 1: Fetch the offer to get authoritative passenger IDs + pricing
  // Step 2: Create the Duffel order with matched passengers
  // Step 3: Persist to local DB
  // ─────────────────────────────────────────────────────────────
  async bookFlight(dto: BookFlightDto) {
    try {
      const offerId = dto.selected_offers[0];
      this.logger.log(`Booking flight for user ${dto.userId}, offer: ${offerId}`);

      // ── Step 1: Fetch the offer to get the correct passenger IDs and pricing ──
      // Duffel passenger IDs are scoped to the offer request that produced the offer.
      // The payment amount and currency must also match the offer exactly.
      this.logger.log(`Fetching offer ${offerId} to resolve passenger IDs and pricing...`);
      const offerResponse = await this.duffel.get(`/air/offers/${offerId}`);
      const offer = offerResponse.data.data;

      const offerPassengers: Array<{ id: string; type: string }> = offer.passengers;

      if (offerPassengers.length !== dto.passengers.length) {
        throw new HttpException(
          `Passenger count mismatch: offer has ${offerPassengers.length} passenger(s) but ${dto.passengers.length} were provided.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      this.logger.log(
        `Resolved offer: total=${offer.total_amount} ${offer.total_currency}, passengers=${JSON.stringify(offerPassengers.map((p) => ({ id: p.id, type: p.type })))}`,
      );

      // ── Step 2: Build the order payload ──
      // Match DTO passengers to offer passenger IDs by index (same order as in the search request).
      const payload = {
        data: {
          selected_offers: dto.selected_offers,
          passengers: offerPassengers.map((offerPax, index) => {
            const dtoPax = dto.passengers[index];
            return {
              id: offerPax.id,           // ← from Duffel offer, NOT the client
              title: dtoPax.title,
              type: dtoPax.type,
              given_name: dtoPax.given_name,
              family_name: dtoPax.family_name,
              born_on: dtoPax.born_on,
              email: dtoPax.email,
              phone_number: dtoPax.phone_number,
              gender: dtoPax.gender,
            };
          }),
          payments: [
            {
              type: 'balance',
              amount: offer.total_amount,       // ← from Duffel offer, NOT the client
              currency: offer.total_currency,   // ← from Duffel offer, NOT the client
            },
          ],
        },
      };

      const response = await this.duffel.post('/air/orders', payload);
      const order = response.data.data;
      this.logger.log(`Duffel order created: ${order.id}`);

      // ── Step 3: Persist to local database ──
      const booking = await this.prisma.booking.create({
        data: {
          userId: dto.userId,
          duffelOrderId: order.id,
          bookingType: dto.bookingType as BookingType,
          status: BookingStatus.CONFIRMED,
          totalAmount: parseFloat(order.total_amount),
          currency: order.total_currency,
        },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      });

      this.logger.log(`Booking saved to DB with id: ${booking.id}`);

      return {
        booking_id: booking.id,
        duffel_order_id: order.id,
        status: booking.status,
        total_amount: booking.totalAmount,
        currency: booking.currency,
        booking_type: booking.bookingType,
        created_at: booking.createdAt,
        user: booking.user,
        order_details: {
          slices: order.slices?.map((s: any) => ({
            origin: s.origin.iata_code,
            destination: s.destination.iata_code,
            departure_at: s.segments?.[0]?.departing_at,
            arrival_at: s.segments?.[s.segments.length - 1]?.arriving_at,
          })),
          documents: order.documents,
        },
      };
    } catch (error) {
      // Re-throw HttpExceptions from passenger count check directly
      if (error instanceof HttpException) throw error;
      this.logger.error('Flight booking failed', error?.response?.data ?? error.message);
      throw new HttpException(
        error?.response?.data?.errors?.[0]?.message ?? 'Flight booking failed',
        error?.response?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
