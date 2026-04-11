# Payment Method Test Page

Use `payment-method-test.html` with your local backend to test Stripe card save, payment method list, subscription create, and incomplete payment confirmation.

## Setup

1. Start the NestJS backend on `http://localhost:3000`.
2. Open `payment-method-test.html` with a local static server, for example VS Code Live Server.
3. Replace the Stripe publishable key in the HTML file if needed.
4. Paste your JWT token into the page.

## Card Add Flow

1. Enter `Email` and `Name`.
2. Click `Create Setup Intent`.
3. Stripe returns a `clientSecret`.
4. Click `Save Card`.
5. After successful confirmation, the page gets a `pm_...` payment method id.
6. The page saves that payment method through `POST /subscriptions/payment-methods`.

## Subscribe Flow

1. Enter a `Plan ID`.
2. Make sure a valid `pm_...` id is present in the `Existing Payment Method ID` field.
3. Click `Subscribe Plan`.
4. If the response returns a `clientSecret`, the first subscription payment is still pending.
5. Click `Confirm Subscription Payment` to finish the Stripe payment step.
6. After webhook processing, the subscription should move from `incomplete` to `active`.

## Useful Routes

- `POST /subscriptions/payment-methods/setup-intent`
- `POST /subscriptions/payment-methods`
- `GET /subscriptions/payment-methods`
- `POST /subscriptions/subscribe`
- `POST /subscriptions/webhook`
- `GET /subscriptions/my-subscription`

## Notes

- `pm_...` is created only after Stripe confirms the setup intent.
- `incomplete` in the Stripe dashboard means the first invoice payment still needs confirmation.
- The webhook is what updates the database status after Stripe completes the payment.
