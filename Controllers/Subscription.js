const { PLAN_QUOTAS } = require('../Enums/OurConstant');
const { PRICE_IDS, STRIPE_SECRET_KEY } = require('../Enums/StripeConstant');
const { CouponModel } = require('../Models/CouponModel');
const { SubscriptionModel } = require('../Models/SubscriptionModel');
const { UserModal } = require('../Models/UserModel');
const {
  createStripeCustomer,
  createStripeSubscription,
  attachPaymentMethodToStripeCustomer,
  cancelStripeSubscription,
  ensureStripeCustomer,
} = require('../Services/Stripe.service');
const { getDateAfterMonths } = require('../Utils/Converter');

const stripe = require('stripe')(STRIPE_SECRET_KEY);

const createSubscription = async (req, res) => {
  try {
    const { planName, couponCode, eligibleForTrial } = req.body;
    const { userId } = req.query;

    const user = await UserModal.findById(userId).select('+stripeCustomerId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Check if user already has an active/trialing subscription (DB + Stripe double check)
    let hasActiveOrTrialing = false;

    const currentSub = user.currentSubscription;
    if (currentSub && (currentSub.status === 'active' || currentSub.status === 'trialing')) {
      hasActiveOrTrialing = true;
    }

    if (user.stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        expand: ['data.plan.product'],
      });

      const stripeActive = subscriptions.data.some((sub) => sub.status === 'active' || sub.status === 'trialing');

      if (stripeActive) hasActiveOrTrialing = true;
    }

    if (hasActiveOrTrialing) {
      return res.status(400).json({
        message: 'You already have an active or trialing subscription. first cancel it then create new subscription.',
      });
    }

    // If no active/trialing subscription, check if user ever subscribed before
    let hasSubscribedBefore = false;

    if (user.stripeCustomerId) {
      const allSubs = await stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
      });

      hasSubscribedBefore = allSubs.data.some((sub) => sub.status !== 'incomplete' && sub.status !== 'incomplete_expired');
    }

    // --- Verify Coupon Securely ---
    let appliedCoupon = null;
    if (couponCode) {
      const couponDoc = await CouponModel.findOne({ name: couponCode });
      if (!couponDoc) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }
      if (coupon.usedBy?.includes(user?.email)) {
        return res.status(400).json({ success: false, message: 'you have already used this coupon' });
      }
      appliedCoupon = couponDoc;
    }

    if (!PRICE_IDS[planName]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const customerId = await ensureStripeCustomer(user);

    // Build subscription object
    const subscriptionData = {
      customer: customerId,
      items: [{ price: PRICE_IDS[planName] }],
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent', 'items.data.price.product'],
    };

    // Apply trial (decided only by backend)
    if (!hasSubscribedBefore && !appliedCoupon) {
      subscriptionData.trial_period_days = 14;
    } else if (!hasSubscribedBefore && appliedCoupon) {
      subscriptionData.trial_period_days = 30;
    }

    const subscription = await stripe.subscriptions.create(subscriptionData);

    // If coupon applied, mark it as used
    if (appliedCoupon) {
      appliedCoupon.usedBy.push(user.email);
      await appliedCoupon.save();
    }

    const newSubscriptionData = {
      planName,
      status: subscription.status,
      subscriptionType: appliedCoupon ? 'coupon' : 'stripe',
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      currentPeriodStart: new Date(subscription?.items?.data?.[0]?.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription?.items?.data?.[0]?.current_period_end * 1000),
      userRef: user._id,
    };

    const subscriptionDoc = await SubscriptionModel.findOneAndUpdate({ userRef: user._id }, newSubscriptionData, { new: true, upsert: true });

    user.currentSubscription = subscriptionDoc._id;
    await user.save();

    res.json({
      success: true,
      subscriptionId: subscription.id,
      status: subscription.status,
      eligibleForTrial: !hasSubscribedBefore,
      appliedCoupon: appliedCoupon ? appliedCoupon.name : null,
    });
  } catch (err) {
    console.error('Stripe subscription error:', err?.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

const cancelSubscription = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const subscription = await SubscriptionModel.findOne({ userRef: userId }).select('+stripeCustomerId +stripeSubscriptionId');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found for this user.' });
    }

    if (subscription.subscriptionType === 'coupon') {
      subscription.status = 'canceled';
      subscription.currentPeriodEnd = new Date();
      await subscription.save();
    } else {
      if (!subscription.stripeSubscriptionId) {
        return res.status(404).json({ success: false, message: 'No subscription found for this user.' });
      }
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);

      if (!['active', 'past_due', 'trialing'].includes(stripeSub.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot cancel subscription because it is currently "${stripeSub.status}".`,
        });
      }

      let stripeResponse;
      try {
        stripeResponse = await cancelStripeSubscription(subscription.stripeSubscriptionId);
      } catch (stripeErr) {
        console.error('Stripe subscription cancel error:', stripeErr);
        return res.status(500).json({
          success: false,
          message: 'Failed to cancel subscription on Stripe. Please try again.',
          error: stripeErr.message,
        });
      }

      subscription.status = 'canceled';
      subscription.currentPeriodEnd = new Date();
      await subscription.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Subscription successfully canceled.',
      subscription: subscription,
    });
  } catch (err) {
    console.error('Cancel subscription error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error. Could not cancel subscription.',
      error: err.message,
    });
  }
};

const verifyCanSubscribe = async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    // Get user
    const user = await UserModal.findById(userId).populate('currentSubscription');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validCustomerId = await ensureStripeCustomer(user);
    let hasActiveOrTrialing = false;

    // Check DB subscription
    const currentSub = user.currentSubscription;
    if (currentSub && (currentSub.status === 'active' || currentSub.status === 'trialing')) {
      hasActiveOrTrialing = true;
    }

    if (validCustomerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: validCustomerId,
        status: 'all',
        expand: ['data.plan.product'],
      });

      const stripeActive = subscriptions.data.some((sub) => sub.status === 'active' || sub.status === 'trialing');

      console.log('📬📬📬', subscriptions.data);
      if (stripeActive) hasActiveOrTrialing = true;
    }

    if (hasActiveOrTrialing) {
      return res.status(400).json({
        error: 'You already have an active or trialing subscription.',
        canSubscribe: false,
        eligibleForTrial: false,
      });
    }

    // If no active/trialing subscription, check if user ever subscribed before
    let hasSubscribedBefore = false;

    if (validCustomerId) {
      const allSubs = await stripe.subscriptions.list({
        customer: validCustomerId,
        status: 'all',
      });

      hasSubscribedBefore = allSubs.data.some((sub) => sub.status !== 'incomplete' && sub.status !== 'incomplete_expired');
    }

    return res.json({
      canSubscribe: true,
      eligibleForTrial: !hasSubscribedBefore, // eligible for free trial if never subscribed before
    });
  } catch (err) {
    console.error('verifyCanSubscribe error:', err);
    return res.status(500).json({ error: err.message });
  }
};

const verifyCoupon = async (req, res) => {
  try {
    const { couponCode } = req.body;
    const { user } = req;

    if (!couponCode) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Coupon code is required',
      });
    }

    const coupon = await CouponModel.findOne({ name: couponCode });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Invalid coupon code',
      });
    }

    if (coupon.usedBy.includes(user?.email)) {
      return res.status(400).json({ success: false, message: 'you have already used this coupon' });
    }

    // if (coupon.expiryDate && coupon.expiryDate < new Date()) {
    //   return res.status(200).json({
    //     success: true,
    //     valid: false,
    //     message: 'Coupon has expired',
    //   });
    // }

    return res.status(200).json({
      success: true,
      message: 'Coupon is valid',
      valid: true,
      name: coupon.name,
    });
  } catch (err) {
    console.error('verifyCoupon error:', err);
    return res.status(500).json({
      success: false,
      valid: false,
      message: 'Server error while verifying coupon',
    });
  }
};

const getOrSetDefaultPaymentMethod = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await UserModal.findById(userId).select('+stripeCustomerId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = await ensureStripeCustomer(user);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    if (!paymentMethods.data.length) {
      return res.status(404).json({ error: 'No payment methods found' });
    }

    const customer = await stripe.customers.retrieve(customerId);

    let defaultPaymentMethodId = customer?.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethodId) {
      defaultPaymentMethodId = paymentMethods.data[0].id;

      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: defaultPaymentMethodId },
      });
    }

    const defaultPaymentMethod = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);

    return res.json({
      success: true,
      paymentMethod: defaultPaymentMethod,
    });
  } catch (err) {
    console.error('getOrSetDefaultPaymentMethod error:', err);
    res.status(500).json({ error: err.message });
  }
};

const createSetupIntent = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const user = await UserModal.findById(userId).select('+stripeCustomerId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = await ensureStripeCustomer(user);

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
    });

    return res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
    });
  } catch (err) {
    console.error('createSetupIntent error:', err);
    res.status(500).json({ error: err.message });
  }
};

const setDefaultPaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.body;
    const { userId } = req.query;

    if (!userId || !paymentMethodId) {
      return res.status(400).json({ error: 'userId and paymentMethodId are required' });
    }

    const user = await UserModal.findById(userId).select('+stripeCustomerId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const customerId = await ensureStripeCustomer(user);

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return res.json({
      success: true,
      message: 'Payment method set as default successfully',
      paymentMethod,
    });
  } catch (err) {
    console.error('setDefaultPaymentMethod error:', err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createSubscription,
  cancelSubscription,
  createSetupIntent,
  verifyCanSubscribe,
  verifyCoupon,
  setDefaultPaymentMethod,
  getOrSetDefaultPaymentMethod,
};
