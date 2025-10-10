const { PRICE_IDS } = require('../Enums/StripeConstant');
const { CouponModel } = require('../Models/CouponModel');
const { SubscriptionModel } = require('../Models/SubscriptionModel');
const { UserModal } = require('../Models/UserModel');
const {
  createStripeSubscription,
  attachPaymentMethodToStripeCustomer,
  cancelStripeSubscription,
  ensureStripeCustomer,
  getUserSubscritionsList,
  getStripeSubscription,
  getUserPaymentMethodsList,
  getStripeUser,
  getUserPaymentMethod,
  createStripeSetupIntent,
  setAsDefaultPaymentMethod,
  updateStripeSubscription,
  getInvoicesOfCustomer,
} = require('../Services/Stripe.service');

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
      const subscriptions = await getUserSubscritionsList(user.stripeCustomerId);
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
      const allSubs = await getUserSubscritionsList(user.stripeCustomerId);
      hasSubscribedBefore = allSubs.data.some((sub) => sub.status !== 'incomplete' && sub.status !== 'incomplete_expired');
    }

    // --- Verify Coupon Securely ---
    let appliedCoupon = null;
    if (couponCode) {
      const couponDoc = await CouponModel.findOne({ name: couponCode });
      if (!couponDoc) {
        return res.status(400).json({ success: false, message: 'Invalid coupon code' });
      }
      if (couponDoc.usedBy?.includes(user?.email)) {
        return res.status(400).json({ success: false, message: 'you have already used this coupon' });
      }
      appliedCoupon = couponDoc;
    }

    if (!PRICE_IDS[planName]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const customerId = await ensureStripeCustomer(user);
    let trial_period_days = null;

    // Apply trial (decided only by backend)
    if (!hasSubscribedBefore && !appliedCoupon) {
      trial_period_days = 14;
    } else if (!hasSubscribedBefore && appliedCoupon) {
      trial_period_days = 30;
    }

    const subscription = await createStripeSubscription(customerId, PRICE_IDS[planName], trial_period_days);

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

const upgradeSubscription = async (req, res) => {
  try {
    const { user } = req || {};
    const { planName } = req.body || {};

    if (!user?._id) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    if (!PRICE_IDS[planName]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    const subscription = await SubscriptionModel.findOne({ userRef: user._id }).select('+stripeCustomerId +stripeSubscriptionId');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found for this user.' });
    }
    if (subscription.subscriptionType === 'invite' || subscription.planName === 'full_access') {
      return res.status(403).json({
        success: false,
        message: 'You cannot upgrade your plan because it is a full access plan.',
      });
    }

    const subscriptionId = subscription.stripeSubscriptionId;
    const stripeCustomerId = await ensureStripeCustomer(user);

    if (!stripeCustomerId || !subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Stripe customer or subscription ID missing.',
      });
    }

    const currentSubscription = await getStripeSubscription(subscriptionId);
    if (!currentSubscription?.items?.data?.length) {
      return res.status(400).json({ success: false, message: 'No subscription items found in Stripe.' });
    }

    const currentItemId = currentSubscription.items.data[0].id;

    const updatedSubscription = await updateStripeSubscription(subscriptionId, currentItemId, PRICE_IDS?.[planName]);

    subscription.planName = planName;
    subscription.status = updatedSubscription?.status;
    subscription.subscriptionType = 'stripe';
    subscription.currentPeriodStart = new Date(updatedSubscription?.items?.data?.[0]?.current_period_start * 1000);
    subscription.currentPeriodEnd = new Date(updatedSubscription?.items?.data?.[0]?.current_period_end * 1000);
    const savedSubscription = await subscription.save();

    return res.status(200).json({
      success: true,
      message: 'Subscription updated successfully.',
      subscription: savedSubscription,
    });
  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update subscription.',
      error: error.message,
    });
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

    if (subscription.subscriptionType === 'invite') {
      // subscription.status = 'canceled';
      // subscription.currentPeriodEnd = new Date();
      // await subscription.save();
      return res.status(500).json({
        success: false,
        message: 'You cannot cancel your plan because it is full access plan',
      });
    } else {
      if (!subscription.stripeSubscriptionId) {
        return res.status(404).json({ success: false, message: 'No subscription found for this user.' });
      }
      const stripeSub = await getStripeSubscription(subscription.stripeSubscriptionId);

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
      // await subscription.save();
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
    const user = await UserModal.findById(userId).populate('currentSubscription');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validCustomerId = await ensureStripeCustomer(user);
    let hasActiveOrTrialing = false;

    const currentSub = user.currentSubscription;
    if (currentSub && (currentSub.status === 'active' || currentSub.status === 'trialing')) {
      hasActiveOrTrialing = true;
    }

    if (validCustomerId) {
      const subscriptions = await getUserSubscritionsList(validCustomerId);
      const stripeActive = subscriptions.data.some((sub) => sub.status === 'active' || sub.status === 'trialing');
      if (stripeActive) hasActiveOrTrialing = true;
    }

    if (hasActiveOrTrialing) {
      return res.status(400).json({
        error: 'You already have an active or trialing subscription.',
        canSubscribe: false,
        eligibleForTrial: false,
      });
    }

    let hasSubscribedBefore = false;

    if (validCustomerId) {
      const allSubs = await getUserSubscritionsList(validCustomerId);
      hasSubscribedBefore = allSubs.data.some((sub) => sub.status !== 'incomplete' && sub.status !== 'incomplete_expired');
    }

    return res.json({
      canSubscribe: true,
      eligibleForTrial: !hasSubscribedBefore,
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
    const paymentMethods = await getUserPaymentMethodsList(customerId);

    if (!paymentMethods.data.length) {
      return res.status(404).json({ error: 'No payment methods found' });
    }

    const customer = await getStripeUser(customerId);
    let defaultPaymentMethodId = customer?.invoice_settings?.default_payment_method;

    if (!defaultPaymentMethodId) {
      defaultPaymentMethodId = paymentMethods.data[0].id;
      await setAsDefaultPaymentMethod(customerId, defaultPaymentMethodId);
    }

    const defaultPaymentMethod = await getUserPaymentMethod(defaultPaymentMethodId);
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
    const setupIntent = await createStripeSetupIntent(customerId);

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

    await attachPaymentMethodToStripeCustomer(customerId, paymentMethodId);
    await setAsDefaultPaymentMethod(customerId, paymentMethodId);

    const paymentMethod = await getUserPaymentMethod(paymentMethodId);

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

const getInvoices = async (req, res) => {
  try {
    const { user } = req || {};

    if (!user?._id) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    const subscription = await SubscriptionModel.findOne({ userRef: user._id }).select('+stripeCustomerId');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'No subscription found for this user.' });
    }

    const customerId = await ensureStripeCustomer(user);

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Stripe customer ID not found.' });
    }

    const invoices = await getInvoicesOfCustomer(customerId);

    console.log(JSON.stringify(invoices[0], null, 2));



    const formattedInvoices = invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.number,
      amount: (inv.amount_paid || inv.amount_due) / 100,
      currency: inv.currency?.toUpperCase(),
      status: inv.status,
      periodStart: inv.period_start ? new Date(inv.period_start * 1000) : null,
      periodEnd: inv.period_end ? new Date(inv.period_end * 1000) : null,
      hostedInvoiceUrl: inv.hosted_invoice_url,
      paymentStatus: inv.payment_intent?.status || 'unknown',
      createdAt: new Date(inv.created * 1000),
      subscriptionId: inv.subscription || null,
    }));

    return res.status(200).json({
      success: true,
      message: 'Invoices fetched successfully.',
      invoices: formattedInvoices,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invoices.',
      error: error.message,
    });
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
  upgradeSubscription,
  getInvoices,
};
