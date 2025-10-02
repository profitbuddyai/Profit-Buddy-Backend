const { NODE_ENV } = require('./OurConstant');

const PRICE_IDS =
  NODE_ENV !== 'production'
    ? {
        basic_monthly: 'price_1S7ttCQ2jkTuccFDz6xkSpSX',
        basic_yearly: 'price_1SBBhGQ2jkTuccFDNeWLFOdB',
        business_monthly: 'price_1S7tu6Q2jkTuccFDPE9f4OOJ',
        business_yearly: 'price_1SBBnXQ2jkTuccFDDlDPvCi5',
      }
    : {
        basic_monthly: 'price_1SBaPHE2ACc4UW7FpSaF3dy1',
        basic_yearly: 'price_1SBaNUE2ACc4UW7F7VB4lvSG',
        business_monthly: 'price_1SBaOYE2ACc4UW7FTfAhLHSB',
        business_yearly: 'price_1SBaM5E2ACc4UW7F2hOXXsFr',
      };

const STRIPE_SECRET_KEY = NODE_ENV !== 'production' ? process.env.TEST_STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = NODE_ENV !== 'production' ? process.env.TEST_STRIPE_WEBHOOK_SECRET : process.env.STRIPE_WEBHOOK_SECRET;

module.exports = { PRICE_IDS, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET };