import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { aiResponse } from 'src/config/ai/ai-response';

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async createAIResponse(createAiDto: CreateAiDto, userId: number) {
    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst(
      {
        where: {
          userId: userId,
        },
      },
    );

    if (!activeSubscriptionPlan) {
      throw new NotFoundException(
        'No active subscription plan found for the user',
      );
    }

    const session = await this.prisma.aiSession.create({
      data: {
        userId,
        sessionId: randomUUID(),
      },
    });

    // Send message to this session
    return await this.sendMessageToSession(userId, session.sessionId, {
      message: createAiDto.message,
    });
  }

  async sendMessageToSession(
    userId: number,
    sessionId: string,
    sendMessageDto: SendMessageDto,
  ) {
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const userExists = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      throw new NotFoundException('User not found');
    }

    const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst(
      {
        where: { userId },
      },
    );

    if (!activeSubscriptionPlan) {
      throw new NotFoundException(
        'No active subscription plan found for the user',
      );
    }

    // Prepare payload for AI response
    const payload = {
      message: sendMessageDto.message,
      session_id: session.sessionId,
      user_id: String(userId),
      // subscription_plan: activeSubscriptionPlan.planType.toUpperCase(),
      subscription_plan: 'pro',
    };

    // Get AI response
    const aiResponseData = await aiResponse(payload);
    if (aiResponseData.rate_limit_exceeded === true) {
      throw new Error('Rate limit exceeded');
    }
    console.log({ aiResponseData });
    // Save the message exchange

    const message = await this.prisma.aiMessage.create({
      data: {
        sessionId: session.sessionId,
        description: aiResponseData?.description,
        currentStep: aiResponseData?.current_step || 'location',
        tripCard: aiResponseData?.trip_cards,
        tripGuide: aiResponseData?.trip_guide,
        submitted: aiResponseData?.submitted ?? false,
        checkoutRequired: aiResponseData?.checkout_required ?? false,
        clientMessage: sendMessageDto.message,
        aiMessage: aiResponseData?.ai_message || '',
        extractedData: aiResponseData?.parameters_extracted,
      },
    });

    return message;
  }

  async getAllSessions(userId: number) {
    const sessions = await this.prisma.aiSession.findMany({
      where: { userId },
      select: {
        sessionId: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            clientMessage: true,
            aiMessage: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((session) => ({
      session_id: session.sessionId,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      last_client_message:
        session.messages.length > 0
          ? session.messages[session.messages.length - 1].clientMessage
          : null,
      last_ai_message:
        session.messages.length > 0
          ? session.messages[session.messages.length - 1].aiMessage
          : null,
      message_count: session.messages.length,
    }));
  }

  /**
   * Get a specific session with all its messages
   */
  async getSessionAllMessagesById(userId: number, sessionId: string) {
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session.messages.map((message) => ({
      session_id: session.sessionId,
      user_id: String(session.userId),
      description: message.description,
      client_message: message.clientMessage,
      ai_message: message.aiMessage,
      current_step: message.currentStep,
      parameters_extracted: {
        // location: message.location,
        // start_date: message.startDate,
        // end_date: message.endDate,
        // travelers: message.travelers,
        // budget: message.budget,
        // experience: message.experience,
        // citizenship: message.citizenship,
        // passengers: message.passengers,
        passenger_preferences: message.passengerPreferences,
      },
      trip_card: message.tripCard,
      trip_guide: message.tripGuide,
      submitted: message.submitted,
      checkout_required: message.checkoutRequired,
      created_at: message.createdAt,
      updated_at: message.updatedAt,
    }));
  }

  /**
   * Delete a session
   */
  async deleteSession(userId: number, sessionId: string) {
    const session = await this.prisma.aiSession.findFirst({
      where: {
        sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.prisma.aiSession.delete({
      where: { sessionId },
    });

    return { message: 'Session deleted successfully', sessionId };
  }
}
