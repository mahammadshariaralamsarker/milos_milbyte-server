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

  async attachPaymentMethodToCustomer(
    customerId: string,
    paymentMethodId: string,
  ) {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  async listCustomerPaymentMethods(customerId: string) {
    const rest = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    console.log(rest);
    return rest;
  }

  async getCustomerDefaultPaymentMethod(customerId: string) {
    const customer = await this.stripe.customers.retrieve(customerId);

    if ('deleted' in customer && customer.deleted) {
      return null;
    }

    return customer.invoice_settings?.default_payment_method || null;
  }

  async setCustomerDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string | null,
  ) {
    return this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId || undefined,
      },
    });
  }

  async detachPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.detach(paymentMethodId);
  }

  async getPaymentMethod(paymentMethodId: string) {
    return this.stripe.paymentMethods.retrieve(paymentMethodId);
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    paymentMethodId?: string,
    metadata?: Record<string, string>,
  ) {
    return this.stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      payment_behavior: 'default_incomplete',
      collection_method: 'charge_automatically',
      metadata,
      expand: ['latest_invoice.payment_intent', 'latest_invoice.lines'],
    });
  }

  async createSetupIntent(customerId: string) {
    return this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
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
