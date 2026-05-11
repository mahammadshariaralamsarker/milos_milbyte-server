import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.fromAddress = process.env.SMTP_FROM || user || 'no-reply@localhost';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn(
        'SMTP environment variables are incomplete. Subscription emails will be logged instead of sent.',
      );
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async sendSubscriptionEmail(params: {
    to: string;
    name: string;
    action: 'created' | 'upgraded' | 'renewed' | 'failed' | 'cancelled';
    planName: string;
    previousPlanName?: string | null;
    periodEnd?: Date | null;
  }) {
    const subjectMap: Record<typeof params.action, string> = {
      created: `Your subscription to ${params.planName} is active`,
      upgraded: `Your subscription was upgraded to ${params.planName}`,
      renewed: `Your subscription to ${params.planName} was renewed`,
      failed: `Payment failed for your ${params.planName} subscription`,
      cancelled: `Your subscription to ${params.planName} was cancelled`,
    };

    const bodyLines = [
      `Hello ${params.name},`,
      '',
      this.buildActionLine(
        params.action,
        params.planName,
        params.previousPlanName,
      ),
      params.periodEnd
        ? `Current billing period ends on ${params.periodEnd.toISOString()}.`
        : null,
      '',
      'If you did not expect this change, please contact support.',
    ].filter((line): line is string => Boolean(line));

    const text = bodyLines.join('\n');

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: params.to,
        subject: subjectMap[params.action],
        text,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send subscription email to ${params.to}`,
        error,
      );
      throw error;
    }
  }

  private buildActionLine(
    action: 'created' | 'upgraded' | 'renewed' | 'failed' | 'cancelled',
    planName: string,
    previousPlanName?: string | null,
  ) {
    switch (action) {
      case 'created':
        return `Your subscription to ${planName} is now active.`;
      case 'upgraded':
        return previousPlanName
          ? `Your subscription has been upgraded from ${previousPlanName} to ${planName}.`
          : `Your subscription has been upgraded to ${planName}.`;
      case 'renewed':
        return `Your ${planName} subscription payment was successful and your plan is active.`;
      case 'failed':
        return `We could not process the latest payment for your ${planName} subscription.`;
      case 'cancelled':
        return `Your ${planName} subscription has been cancelled.`;
    }
  }
}
