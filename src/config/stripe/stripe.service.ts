import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: InstanceType<typeof Stripe>;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2024-04-10',
    } as any);
  }

  async createPrice(
    productId: string,
    amount: number,
    currency: string = 'usd',
  ) {
    return this.stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      product: productId,
      recurring: {
        interval: 'month',
        interval_count: 1,
      },
    });
  }

  async createProduct(name: string, description?: string) {
    return this.stripe.products.create({
      name,
      description,
      type: 'service',
    });
  }

  async getOrCreateCustomer(email: string, name: string) {
    const customers = await this.stripe.customers.list({
      email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }

    return this.createCustomer(email, name);
  }

  async cancelSubscription(subscriptionId: string, immediately = false) {
    if (immediately) {
      return await this.stripe.subscriptions.cancel(subscriptionId);
    }
    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async updateSubscription(subscriptionId: string, items: any) {
    return await this.stripe.subscriptions.update(subscriptionId, {
      items,
    });
  }

  async getSubscriptionItemId(subscriptionId: string) {
    const subscription =
      await this.stripe.subscriptions.retrieve(subscriptionId);

    const item = subscription.items.data[0];
    return item?.id;
  }

  async createCustomer(email: string, name: string) {
    return this.stripe.customers.create({
      email,
      name,
    });
  }

  async getCustomer(customerId: string) {
    return this.stripe.customers.retrieve(customerId);
  }

  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
  ) {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}
