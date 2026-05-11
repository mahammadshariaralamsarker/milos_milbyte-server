import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/config/prisma/prisma.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { SendMessageDto } from './dto/send-message.dto';
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

    // const activeSubscriptionPlan = await this.prisma.userSubscription.findFirst(
    //   {
    //     where: {
    //       userId: userId,
    //     },
    //   },
    // );

    // if (!activeSubscriptionPlan) {
    //   throw new NotFoundException(
    //     'No active subscription plan found for the user',
    //   );
    // }

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

    // attach client message into the AI response payload
    try {
      (aiResponseData as any).client_message = sendMessageDto.message;
    } catch { }

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
    // include stored message id in response object
    try {
      (aiResponseData as any).message_id = message.id;
    } catch { }

    return aiResponseData;
    // return {
    //   session_id: session.sessionId,
    //   user_id: String(userId),
    //   ai_message: aiResponseData?.ai_message || '',
    //   current_step: aiResponseData?.current_step || 'location',
    //   parameters_extracted: {
    //     location: aiResponseData?.parameters_extracted?.location || null,
    //     start_date: aiResponseData?.parameters_extracted?.start_date || null,
    //     end_date: aiResponseData?.parameters_extracted?.end_date || null,
    //     travelers: aiResponseData?.parameters_extracted?.travelers || null,
    //     budget: aiResponseData?.parameters_extracted?.budget || null,
    //     experience: aiResponseData?.parameters_extracted?.experience || null,
    //     citizenship: aiResponseData?.parameters_extracted?.citizenship || null,
    //     passengers: aiResponseData?.parameters_extracted?.passengers || null,
    //     passenger_preferences: aiResponseData?.parameters_extracted?.passenger_preferences || null,
    //   },
    //   trip_card: aiResponseData?.trip_cards || null,
    //   trip_guide: aiResponseData?.trip_guide || null,
    //   submitted: aiResponseData?.submitted ?? false,
    //   checkout_required: aiResponseData?.checkout_required ?? false,
    //   rate_limit_exceeded: aiResponseData?.rate_limit_exceeded ?? false,
    //   message_id: message.id,
    // };
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

    return session.messages.map((message) => {
      const extractedData = message.extractedData as any || {};
      return {
        session_id: session.sessionId,
        user_id: String(session.userId),
        ai_message: message.aiMessage,
        current_step: message.currentStep,
        parameters_extracted: {
          location: extractedData?.location || null,
          start_date: extractedData?.start_date || null,
          end_date: extractedData?.end_date || null,
          travelers: extractedData?.travelers || null,
          budget: extractedData?.budget || null,
          experience: extractedData?.experience || null,
          citizenship: extractedData?.citizenship || null,
          passengers: extractedData?.passengers || null,
          passenger_preferences: extractedData?.passenger_preferences || null,
        },
        trip_card: message.tripCard,
        trip_guide: message.tripGuide,
        submitted: message.submitted,
        checkout_required: message.checkoutRequired,
        rate_limit_exceeded: false,
        client_message: message.clientMessage,
        message_id: message.id,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
      };
    });
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
