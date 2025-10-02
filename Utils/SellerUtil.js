const { keepaToMs } = require('./GraphCsvUtils');

const calculateSellerMetricsLast30Days = (products, sellerId) => {
  const inStockRates = [];
  const averagePrices = [];
  const monthlySales = []; // placeholder, replace with actual sales if available

  const now = Math.floor(Date.now()); // Keepa timestamps are in seconds
  const thirtyDays = 30 * 24 * 60 * 60 * 1000; // 30 days in seconds

  products.forEach((product) => {
    if (!product.offers) return;

    const sellerOffers = product.offers.filter((o) => o.sellerId === sellerId);
    if (!sellerOffers.length) return;

    let totalSnapshots = 0;
    let inStockSnapshots = 0;
    const prices = [];

    sellerOffers.forEach((offer) => {
      const stockCSV = offer.stockCSV || [];
      const offerCSV = offer.offerCSV || [];

      // stockCSV format: [timestamp1, stock1, timestamp2, stock2, ...]
      for (let i = 0; i < stockCSV.length; i += 2) {
        const ts = stockCSV[i];
        const stock = stockCSV[i + 1];
        const convertedTs = keepaToMs(ts);

        if (now - convertedTs <= thirtyDays) {
            totalSnapshots++;
            if (stock > 0) inStockSnapshots++;
            
            for (let j = 0; j < offerCSV.length; j += 3) {
            if (offerCSV[j + 1] > 0) {
              prices.push(offerCSV[j + 1]);
              break;
            }
          }
        }
      }
    });

    if (totalSnapshots > 0) {
      inStockRates.push((inStockSnapshots / totalSnapshots) * 100);
      const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      averagePrices.push(avgPrice);
      monthlySales.push(product?.monthlySold || 0);
    }

  });

  if (!inStockRates.length) return { overallStockRate: 0, averagePrice: 0, finalMetric: 0 };

  const overallStockRate = inStockRates.reduce((a, b) => a + b, 0) / inStockRates.length;
  const overallAvgPrice = averagePrices.reduce((a, b) => a + b, 0) / averagePrices.length;
  const totalMonthlySales = monthlySales.reduce((a, b) => a + b, 0);

  const finalMetric = (overallStockRate / 100) * totalMonthlySales * overallAvgPrice;

  return {
    overallStockRate,
    averagePrice: overallAvgPrice,
    finalMetric,
  };
};

module.exports = { calculateSellerMetricsLast30Days };
