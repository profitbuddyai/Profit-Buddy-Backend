const { STRIPE_SECRET_KEY } = require('../Enums/StripeConstant');

const stripe = require('stripe')(STRIPE_SECRET_KEY);

const createStripeSubscription = async (customerId, priceId, trialDays = null) => {
  try {
    const subscriptionData = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent', 'items.data.price.product'],
    };

    if (trialDays) {
      subscriptionData.trial_period_days = trialDays;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);

    return subscription;
  } catch (error) {
    console.error('Stripe subscription error:', error);
    throw error;
  }
};

const getStripeSubscription = async (subscriptionId) => {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    throw error;
  }
};

const getUserSubscritionsList = async (stripeCustomerId) => {
  try {
    const allSubs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'all',
      expand: ['data.plan.product'],
    });
    return allSubs;
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
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  return paymentMethodId;
};

const setAsDefaultPaymentMethod = async (customerId, paymentMethodId) => {
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

const getStripeUser = async (stripeCustomerId) => {
  try {
    const customer = await stripe.customers.retrieve(stripeCustomerId);
    return customer;
  } catch (error) {
    throw error;
  }
};

const getUserPaymentMethod = async (paymentMethodId) => {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod;
  } catch (error) {
    throw error;
  }
};

const getUserPaymentMethodsList = async (stripeCustomerId) => {
  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });
    return paymentMethods;
  } catch (error) {
    throw error;
  }
};

const createStripeSetupIntent = async (stripeCustomerId) => {
  try {
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
    });
    return setupIntent;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createStripeSubscription,
  getUserSubscritionsList,
  getStripeSubscription,
  cancelStripeSubscription,
  createStripeCustomer,
  attachPaymentMethodToStripeCustomer,
  setAsDefaultPaymentMethod,
  ensureStripeCustomer,
  getUserPaymentMethod,
  getUserPaymentMethodsList,
  getStripeUser,
  createStripeSetupIntent,
};
