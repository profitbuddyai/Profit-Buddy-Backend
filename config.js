const { NODE_ENV } = require('./Enums/OurConstant');

require('dotenv').config();

module.exports = {
  profitBuddy: {
    baseUrl: NODE_ENV === 'production' ? process.env.LIVE_DOMAIN : process.env.DEV_DOMAIN,
  },
  keepa: {
    baseURL: 'https://api.keepa.com',
    apiKey: process.env.KEEPA_API_KEY,
    amazonDomain: process.env.KEEPA_AMAZON_DOMAIN_CODE,
  },
};
