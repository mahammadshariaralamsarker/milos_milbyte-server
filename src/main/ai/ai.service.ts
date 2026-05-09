import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import axios from "axios";
import { aiResponse } from 'src/config/ai/ai-response';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) { }

  async createAIResponse(createAiDto: CreateAiDto, userId: number) {
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!activeSubscriptionPlan) {
      throw new NotFoundException('No active subscription plan found for the user');
    }


    const payload = {
      message: createAiDto.message,
      session_id: String(userId),
      user_id: String(userId),
      subscription_plan: activeSubscriptionPlan.planType.toUpperCase()
    }


    const aiResponsedata = await aiResponse(payload);

    const savedResponse = await this.prisma.aiSession.create({
      data: {
        sessionId: payload.session_id,
        user: { connect: { id: userId } },
        currentStep: aiResponsedata?.current_step || 'location',
        aiMessage: aiResponsedata?.ai_message || '',
        location: aiResponsedata?.location,
        startDate: aiResponsedata?.start_date,
        endDate: aiResponsedata?.end_date,
        budget: aiResponsedata?.budget,
        experience: aiResponsedata?.experience,
        citizenship: aiResponsedata?.citizenship,
        passengers: aiResponsedata?.passengers,
        passengerPreferences: aiResponsedata?.preferences,
        tripCard: aiResponsedata?.trip_cards,
        tripGuide: aiResponsedata?.trip_guide,
        submitted: aiResponsedata?.submitted || false,
        checkoutRequired: aiResponsedata?.checkout_required || false,
      }
    })

    return {
      session_id: savedResponse.sessionId,
      user_id: String(savedResponse.userId),
      ai_message: savedResponse.aiMessage,
      current_step: savedResponse.currentStep,
      parameters_extracted: {
        location: savedResponse.location,
        start_date: savedResponse.startDate,
        end_date: savedResponse.endDate,
        travelers: savedResponse.travelers,
        budget: savedResponse.budget,
        experience: savedResponse.experience,
        citizenship: savedResponse.citizenship,
        passengers: savedResponse.passengers,
        passenger_preferences: savedResponse.passengerPreferences,
      },
      trip_card: savedResponse.tripCard,
      trip_guide: savedResponse.tripGuide,
      submitted: savedResponse.submitted,
      checkout_required: savedResponse.checkoutRequired,
    };
  }

  async findAllChat(userId: number) {
    const data = await this.prisma.aiSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return data.map((session) => ({
      session_id: session.sessionId,
      user_id: String(session.userId),
      ai_message: session.aiMessage,
      current_step: session.currentStep,
      parameters_extracted: {
        location: session.location,
        start_date: session.startDate,
        end_date: session.endDate,
        travelers: session.travelers,
        budget: session.budget,
        experience: session.experience,
        citizenship: session.citizenship,
        passengers: session.passengers,
        passenger_preferences: session.passengerPreferences,
      },
      trip_card: session.tripCard,
      trip_guide: session.tripGuide,
      submitted: session.submitted,
      checkout_required: session.checkoutRequired,
    }));
  }





}
