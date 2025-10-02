const DEFAULT_SUBSCRIPTION_COUPON = {
  'PROFIT-BUDDY-#COUPON098': {
    planName: 'business_yearly',
    usageLimit: Infinity,
    durationMonths: 12,
  },
};

// -1 = Unlimted
const PLAN_QUOTAS = {
  basic_monthly: { durationMonths: 1, aiChat: 50, supportAccess: true },
  basic_yearly: { durationMonths: 1, aiChat: 600, supportAccess: true },
  business_month: { durationMonths: 12, aiChat: -1, supportAccess: true },
  business_yearly: { durationMonths: 12, aiChat: -1, supportAccess: true },
};

let NODE_ENV = process.env.NODE_ENV;

if (process.env.VERCEL_ENV === 'preview') {
  NODE_ENV = 'development';
} else if (process.env.VERCEL_ENV === 'production') {
  NODE_ENV = 'production';
} else if (!process.env.VERCEL_ENV) {
  NODE_ENV = 'local';
}

module.exports = { DEFAULT_SUBSCRIPTION_COUPON, PLAN_QUOTAS, NODE_ENV };
