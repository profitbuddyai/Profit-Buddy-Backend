const { keepa } = require('../config');
const https = require('https');
const httpClient = require('../Configurations/HttpClient');

const searchProductsFromKeepa = async (searchTerm, page = 0) => {
  try {
    const params = new URLSearchParams({
      key: keepa.apiKey,
      domain: keepa.amazonDomain,
      term: searchTerm,
      page: page,
      type: 'product',
      'asins-only': 1,
    });

    const { data } = await httpClient.get(`${keepa.baseURL}/search?${params.toString()}`);

    if (data.error && data.error.length > 0) {
      throw new Error(`Keepa API Error: ${data.error.join(', ')}`);
    }

    return data;
  } catch (error) {
    console.error('Keepa API request failed:', error);
    throw new Error('Unable to fetch products from Keepa at the moment. Please try again later.');
  }
};

const getProductsFromKeepa = async (asin = '', query = {}) => {
  try {
    const params = new URLSearchParams({
      key: keepa.apiKey,
      domain: keepa.amazonDomain,
      asin: asin,
      ...query,
    });

    const { data } = await httpClient.get(`${keepa.baseURL}/product?${params.toString()}`);

    if (data.error && data.error.length > 0) {
      throw new Error(`Keepa API Error: ${data.error.join(', ')}`);
    }

    return data;
  } catch (error) {
    console.error('Keepa API request failed:', error);
    throw new Error('Unable to fetch products from Keepa at the moment. Please try again later.');
  }
};

const getGraphImageFromKeepa = (asin, res) => {
  const params = new URLSearchParams({
    key: keepa.apiKey,
    domain: keepa.amazonDomain,
    asin,
    salesrank: '1',
    bb: '1',
    title: '0',
  });

  const keepaUrl = `${keepa.baseURL}/graphimage?${params.toString()}`;

  https
    .get(keepaUrl, (keepaRes) => {
      if (keepaRes.statusCode !== 200) {
        res.status(keepaRes.statusCode).json({ success: false, message: 'Keepa API error' });
        return;
      }

      res.setHeader('Content-Type', 'image/png');
      keepaRes.pipe(res);
    })
    .on('error', (err) => {
      res.status(500).json({ success: false, message: err.message });
    });
};

const getSellerInfoFromKeepa = async (sellerId, query = {}) => {
  try {
    const params = new URLSearchParams({
      key: keepa.apiKey,
      domain: keepa.amazonDomain,
      seller: sellerId,
      ...query,
    });

    const { data } = await httpClient.get(`${keepa.baseURL}/seller?${params.toString()}`);

    if (data.error && data.error.length > 0) {
      throw new Error(`Keepa API Error: ${data.error.join(', ')}`);
    }

    return data?.sellers;
  } catch (error) {
    console.error('Keepa API request failed:', error);
    throw new Error('Unable to fetch seller info from Keepa at the moment.');
  }
};

const getCategoryInfoFromKeepa = async (categoryId, query = {}) => {
  try {
    const params = new URLSearchParams({
      key: keepa.apiKey,
      domain: keepa.amazonDomain,
      category: categoryId,
      ...query,
    });

    const { data } = await httpClient.get(`${keepa.baseURL}/category?${params.toString()}`);

    if (data.error && data.error.length > 0) {
      throw new Error(`Keepa API Error: ${data.error.join(', ')}`);
    }

    return data?.categories;
  } catch (error) {
    console.error('Keepa API request failed:', error);
    throw new Error('Unable to fetch category info from Keepa at the moment.');
  }
};

const findProductsAsinsFromKeepa = async (query) => {
  if (!query) return;

  try {
    const params = new URLSearchParams({
      key: keepa.apiKey,
      domain: keepa.amazonDomain,
      selection: query,
    });

    const { data } = await httpClient.get(`${keepa.baseURL}/query?${params.toString()}`);

    if (data.error && data.error.length > 0) {
      throw new Error(`Keepa API Error: ${data.error.join(', ')}`);
    }

    return data?.asinList;
  } catch (error) {
    console.error('Keepa API request failed:', error);
    throw new Error('Unable to fetch products asin from Keepa at the moment.');
  }
};

module.exports = {
  searchProductsFromKeepa,
  getProductsFromKeepa,
  getGraphImageFromKeepa,
  getSellerInfoFromKeepa,
  findProductsAsinsFromKeepa,
  getCategoryInfoFromKeepa,
};
