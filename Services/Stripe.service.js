const { STRIPE_SECRET_KEY } = require('../Enums/StripeConstant');

const stripe = require('stripe')(STRIPE_SECRET_KEY);

const createStripeSubscription = async (customerId, priceId, trialDays = 30) => {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent', 'items.data.price.product'],
  });

  // Create SetupIntent for saving card
  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
  });

  const item = subscription.items.data[0];
  const trialEnd = subscription.trial_end;

  const summary = {
    subscriptionId: subscription.id,
    status: subscription.status,
    planName: item?.price?.product?.name,
    currency: item?.price?.currency,
    amount: item?.price?.unit_amount / 100,
    trialStart: new Date(subscription.trial_start * 1000),
    trialEnd: new Date(trialEnd * 1000),
    nextBillingDate: new Date(trialEnd * 1000),
  };

  return {
    clientSecret: setupIntent.client_secret, // <-- use this on frontend
    subscription,
    summary,
  };
};

// const createStripeSubscription = async (customerId, priceId) => {
//   try {
//     const subscription = await stripe.subscriptions.create({
//       customer: customerId,
//       items: [
//         {
//           price: priceId,
//         },
//       ],
//       payment_behavior: 'default_incomplete',
//       payment_settings: { save_default_payment_method: 'on_subscription' },
//       billing_mode: { type: 'flexible' },
//       expand: ['latest_invoice.confirmation_secret', 'items.data.price.product'],
//     });
//     const invoice = subscription.latest_invoice;
//     const item = invoice.lines.data[0];
//     const item2 = subscription?.items?.data[0];

//     const summary = {
//       subscriptionId: subscription?.id,
//       status: subscription?.status,
//       planName: item2?.price?.product?.name || 'Plan',
//       currency: item?.currency,
//       amount: item?.amount / 100,
//       description: item?.description,
//       startDate: new Date(item?.period?.start * 1000),
//       endDate: new Date(item?.period?.end * 1000),
//     };

//     return {
//       clientSecret: subscription.latest_invoice.confirmation_secret.client_secret,
//       subscription: subscription,
//       summary: summary,
//     };
//   } catch (error) {
//     console.error('Stripe subscription error:', error);
//     throw error;
//   }
// };

const getStripeSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    throw error;
  }
};

const cancelStripeSubscription = async (subscriptionId) => {
  try {
    const stripeResponse = await stripe.subscriptions.cancel(subscriptionId);
    return stripeResponse;
  } catch (error) {
    throw error;
  }
};

const createStripeCustomer = async ({ email, name }) => {
  const userName = name || (email ? email.split('@')[0] : '') || 'Unknown';
  try {
    const customer = await stripe.customers.create({ email, name: userName });
    return customer;
  } catch (error) {
    throw error;
  }
};

const attachPaymentMethodToStripeCustomer = async (customerId, paymentMethodId) => {
  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  return paymentMethodId;
};

const ensureStripeCustomer = async (user) => {
  let customerId = user.stripeCustomerId;

  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        customerId = null;
      }
    } catch (error) {
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        customerId = null;
      } else {
        throw error;
      }
    }
  }
  if (!customerId) {
    const newCustomer = await createStripeCustomer({ email: user.email, name: user?.userName });
    customerId = newCustomer.id;
    user.stripeCustomerId = customerId;
    await user.save();
  }

  return customerId;
};

const getPaidInvoicesOfCustomer = async (customerId) => {
  try {
    const invoices = await stripe.invoices.list({
      customer: customerId,
      status: 'paid',
      limit: 100,
    });

    return invoices.data;
  } catch (error) {
    throw error;
  }
};

module.exports = { createStripeSubscription, getStripeSubscription, cancelStripeSubscription, createStripeCustomer, attachPaymentMethodToStripeCustomer, ensureStripeCustomer };
