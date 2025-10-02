const axios = require('axios');

const httpClient = axios.create({
  timeout: 200000,
});

module.exports = httpClient;
