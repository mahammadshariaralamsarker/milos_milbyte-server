import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriptionPeriodService {
  resolvePeriodDatesFromStripeResponse(stripeData: any, invoiceData?: any) {
    const invoiceLine = invoiceData?.lines?.data?.[0];
    const period = invoiceLine?.period;

    const currentPeriodStart =
      stripeData?.current_period_start ?? period?.start ?? null;
    const currentPeriodEnd =
      stripeData?.current_period_end ?? period?.end ?? null;

    return {
      currentPeriodStart: currentPeriodStart
        ? new Date(currentPeriodStart * 1000)
        : null,
      currentPeriodEnd: currentPeriodEnd
        ? new Date(currentPeriodEnd * 1000)
        : null,
    };
  }

  getPaymentIntentFromSubscription(stripeSubscription: any) {
    const latestInvoice = stripeSubscription?.latest_invoice as any;
    const paymentIntent = latestInvoice?.payment_intent as any;

    return {
      latestInvoice,
      paymentIntent,
      clientSecret: paymentIntent?.client_secret || null,
      paymentIntentStatus: paymentIntent?.status || null,
    };
  }
}
