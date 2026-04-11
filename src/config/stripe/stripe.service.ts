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
      unit_amount: Math.round(amount * 100), // Convert to cents
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

  async createSubscription(customerId: string, priceId: string) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }

  async cancelSubscription(subscriptionId: string, immediately = false) {
    if (immediately) {
      return this.stripe.subscriptions.cancel(subscriptionId);
    }
    return this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async updateSubscription(subscriptionId: string, items: any) {
    return this.stripe.subscriptions.update(subscriptionId, {
      items,
    });
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
}
